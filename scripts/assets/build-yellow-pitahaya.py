"""Photo-informed yellow cultivar, not an exact scan of a yellow fruit.

The measured hull supplies the body profile. Individual tubercles, areoles,
repaired poles and numeric PBR maps are authored separately and reproducibly.
No source photograph or generated albedo is recoloured or overwritten.
"""
from pathlib import Path
import json
import sys
import io
import struct

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'prisma/backups/pitahaya-tools'))
import numpy as np
from scipy.interpolate import PchipInterpolator
from scipy.ndimage import gaussian_filter
from PIL import Image, PngImagePlugin
import trimesh

source = json.loads((ROOT / 'docs/design/pitahaya-photo-profile-20261014.json').read_text())
output = ROOT / 'public/brand'
asset_sources = ROOT / 'docs/design'
rng = np.random.default_rng(20261014)
profile = np.array(source['profile'])
profile = np.vstack([[-1.78, .11], [-1.67, .43], profile, [1.25, .23], [1.38, .10], [1.43, .035]])
curve = PchipInterpolator(profile[:, 0], profile[:, 1])
n_angle, n_height = 256, 192
angle, y = np.meshgrid(np.linspace(0, np.pi * 2, n_angle + 1), np.linspace(-1.78, 1.43, n_height + 1))
base_radius = curve(y) * .80
base_radius *= 1 + .025 * np.sin(angle * 3 + y) + .018 * np.cos(angle * 5 - y * 2)

# Poisson-like spacing avoids repeating rings or continuous diagonal crests.
areoles = []
for _ in range(12000):
    ca, cy = rng.uniform(0, np.pi * 2), rng.uniform(-1.49, 1.15)
    local_radius = float(curve(cy)) * .80
    if any(np.hypot(np.arctan2(np.sin(ca - a['angle']), np.cos(ca - a['angle'])) *
                    min(local_radius, a['radius']), cy - a['y']) < .39 for a in areoles):
        continue
    areoles.append({'angle': ca, 'y': cy, 'radius': local_radius,
        'width': rng.uniform(.22, .29), 'length': rng.uniform(.32, .43),
        'height': rng.uniform(.15, .23) * min(1, local_radius / .55),
        'lean': rng.uniform(-.18, .18), 'scar': rng.uniform(.020, .045),
        'collar': rng.uniform(.55, .80), 'colour': rng.uniform(.8, 1.3),
        'orientation': rng.uniform(-.40, .40), 'green': rng.random() > .3})
    if len(areoles) >= 58:
        break

radius = base_radius.copy()
lobes = np.zeros_like(radius)
collar_tint = np.zeros((*radius.shape, 3))
collar_weight = np.zeros_like(radius)
for a in areoles:
    da = np.arctan2(np.sin(angle - a['angle']), np.cos(angle - a['angle'])) * a['radius']
    dy = y - a['y']
    da -= dy * a['lean']
    w, h = a['width'], a['length']
    c, s = np.cos(a['orientation']), np.sin(a['orientation'])
    across, along = da * c - dy * s, da * s + dy * c
    # Broad integrated base, elongated asymmetric shoulder and displaced apex.
    width = w * (.85 - .48 * np.clip(along / h, -1, 1))
    cap = np.maximum(1 - ((across / width) ** 2 + ((along + h * .12) / h) ** 2), 0) ** .75
    cap *= np.clip(1 + .60 * along / h, .35, 1.6)
    tip = np.exp(-((across / (w * .34)) ** 2 + ((along - h * .36) / (h * .25)) ** 2) * 2)
    lobe = a['height'] * cap + .030 * tip
    lobes += lobe ** 8
    collar = np.exp(-((across / (w * .48)) ** 2 + ((along - h * .36) / (h * .32)) ** 2) * 2) * a['collar']
    colour = np.array([.12, .24, .035] if a['green'] else [.25, .13, .035]) * a['colour']
    collar_tint += collar[..., None] * colour
    collar_weight += collar

radius += gaussian_filter(lobes ** (1 / 8), .6, mode=('nearest', 'wrap'))
crown_band = np.exp(-((y - 1.31) / .13) ** 2)
radius += crown_band * .021 * (np.sin(angle * 5 + .4) + np.sin(angle * 8 - .7))
positions = np.stack([radius * np.cos(angle), y * 1.06 + .025 * np.sin(angle) * np.sin(y) +
    crown_band * .025 * np.sin(angle * 5), radius * np.sin(angle) * .96], axis=-1)
vertices = positions.reshape(-1, 3)
faces = []
stride = n_angle + 1
for row in range(n_height):
    for col in range(n_angle):
        a = row * stride + col
        faces.extend([[a, a + stride, a + 1], [a + 1, a + stride, a + stride + 1]])
uv = np.stack([angle / (2 * np.pi) * 1.5, (y + 1.78) / 3.21 * 2], axis=-1).reshape(-1, 2)

skin = Image.open(asset_sources / 'pitahaya-skin-source-20261014.png').convert('RGB')
compressed = io.BytesIO()
skin.save(compressed, 'JPEG', quality=88, optimize=True)
compressed.seek(0)
skin = Image.open(compressed)

# Numerical surface data, not generated photographs or colour maps.
# Wrapped filters preserve tile boundaries; normal and roughness stay separate.
noise = rng.normal(size=(512, 512))
height = gaussian_filter(noise, 1.6, mode='wrap') + gaussian_filter(noise, 6, mode='wrap')
dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * .8
dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * .8
normal = np.stack([-dx, dy, np.ones_like(height)], axis=-1)
normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
normal_image = Image.fromarray(np.uint8(np.clip(normal * .5 + .5, 0, 1) * 255))
roughness = np.clip(.55 + height * .16, .42, .72)
packed = np.stack([np.ones_like(height), roughness, np.zeros_like(height)], axis=-1)
roughness_image = Image.fromarray(np.uint8(packed * 255))
for name, data in [('normal', normal_image), ('roughness', roughness_image)]:
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text('Origin', 'Procedural numeric PBR data generated by scripts/assets/build-yellow-pitahaya.py; seed 20261014; not a photographic image.')
    metadata.add_text('impeccable:prompt', f'Origin: procedural numeric {name} map authored in scripts/assets/build-yellow-pitahaya.py from wrapped seeded noise (20261014). Not a photograph or AI-generated image.')
    data.save(asset_sources / f'pitahaya-{name}-20261014.png', pnginfo=metadata)

material = trimesh.visual.material.PBRMaterial(name='Yellow-pitahaya-skin', baseColorTexture=skin,
    normalTexture=normal_image, metallicRoughnessTexture=roughness_image,
    metallicFactor=0, roughnessFactor=1, doubleSided=False)
mesh = trimesh.Trimesh(vertices=vertices, faces=np.array(faces), process=False)
mesh.visual = trimesh.visual.texture.TextureVisuals(uv=uv, material=material)
variation = .5 + .5 * np.sin(angle * 7.3 + y * 4.1) * np.cos(angle * 2.1 - y * 6.2)
tint = np.ones((*radius.shape, 4), dtype=np.uint8) * 255
base_tint = np.stack([np.ones_like(y), .81 + variation * .13, .36 + variation * .28], axis=-1)
strength = np.clip(collar_weight, 0, .80)[..., None]
local_collar = collar_tint / np.maximum(collar_weight[..., None], .00001)
colour = base_tint * (1 - strength) + local_collar * strength
# Dry tissue blends into the shell instead of ending in an applied cap.
dry_low = np.clip((-y - 1.59 + .04 * np.sin(angle * 7)) / .19, 0, 1)[..., None]
dry_high = np.clip((y - 1.32 + .025 * np.sin(angle * 5)) / .12, 0, 1)[..., None]
dry = np.maximum(dry_low, dry_high) * .9
colour = colour * (1 - dry) + np.array([.05, .03, .01]) * dry
tint[..., :3] = np.uint8(np.clip(colour, 0, 1) * 255)
mesh.vertex_attributes['color'] = tint.reshape(-1, 4)
scene = trimesh.Scene()
scene.add_geometry(mesh, node_name='Fruit-body', geom_name='Photo-profile-with-individual-tubercles')

def surface_point(ca, cy):
    # Interpolate the displaced shell so each scar is seated in its own tip.
    x = (ca % (np.pi * 2)) / (np.pi * 2) * n_angle
    z = np.clip((cy + 1.78) / 3.21 * n_height, 0, n_height - .001)
    i, j = int(z), int(x)
    fy, fx = z - i, x - j
    return (positions[i, j] * (1 - fx) + positions[i, j + 1] * fx) * (1 - fy) + (positions[i + 1, j] * (1 - fx) + positions[i + 1, j + 1] * fx) * fy

def organic_tissue(center, normal_axis, width, thickness, colour, seed, segments=24, rings=10):
    local_rng = np.random.default_rng(seed)
    axis = np.array(normal_axis, dtype=float)
    axis /= np.linalg.norm(axis)
    u = np.cross(axis, [0, 0, 1] if abs(axis[2]) < .8 else [0, 1, 0])
    u /= np.linalg.norm(u)
    v = np.cross(axis, u)
    points, triangles, colours = [], [], []
    for row in range(rings + 1):
        t = row / rings * np.pi
        for col in range(segments + 1):
            a = col / segments * np.pi * 2
            irregular = 1 + .17 * np.sin(a * 5 + t * 3) + .10 * np.cos(a * 9 - t)
            r = width * np.sin(t) * irregular
            points.append(center + (u * np.cos(a) + v * np.sin(a)) * r + axis * np.cos(t) * thickness)
            fade = local_rng.uniform(.65, 1.15)
            # glTF COLOR_0 is linear; dry-tissue RGB references are authored sRGB.
            srgb = np.clip(np.array(colour) * fade / 255, 0, 1)
            linear = np.where(srgb <= .04045, srgb / 12.92, ((srgb + .055) / 1.055) ** 2.4)
            colours.append([*np.uint8(linear * 255), 255])
    for row in range(rings):
        for col in range(segments):
            i = row * (segments + 1) + col
            triangles.extend([[i, i + 1, i + segments + 1], [i + 1, i + segments + 2, i + segments + 1]])
    part = trimesh.Trimesh(vertices=points, faces=triangles, process=False)
    part.visual = trimesh.visual.ColorVisuals(part, vertex_colors=colours)
    part.fix_normals()
    return part

scars = []
for index, a in enumerate(areoles):
    tip_distance = a['length'] * .36
    shifted_y = np.cos(a['orientation']) * tip_distance
    cy = a['y'] + shifted_y
    ca = a['angle'] + (np.sin(a['orientation']) * tip_distance + shifted_y * a['lean']) / a['radius']
    tangent_a = surface_point(ca + .005, cy) - surface_point(ca - .005, cy)
    tangent_y = surface_point(ca, cy + .005) - surface_point(ca, cy - .005)
    axis = np.cross(tangent_y, tangent_a)
    axis /= np.linalg.norm(axis)
    center = surface_point(ca, cy) + axis * .002
    scar_colour = [int(64 * a['colour']), int(54 * a['colour']), int(25 * a['colour'])]
    scars.append(organic_tissue(center, axis, a['scar'], .009, scar_colour, index, segments=16, rings=8))
scene.add_geometry(trimesh.util.concatenate(scars), node_name='Individual-dry-areoles')
top_parts = [organic_tissue(np.array([0, 1.49, 0]), [0, 1, 0], .043, .025, [65, 53, 27], 73)]
for i in range(9):
    a = i / 9 * 2 * np.pi
    top_parts.append(organic_tissue(np.array([.055 * np.cos(a), 1.45 + .025 * np.sin(a * 3), .055 * np.sin(a)]),
        [np.cos(a), .35, np.sin(a)], .027, .012, [83, 64, 31], 100 + i, segments=16, rings=8))
scene.add_geometry(trimesh.util.concatenate(top_parts), node_name='Folded-upper-dry-tissue')
bottom_parts = [organic_tissue(np.array([0, -1.89, 0]), [0, -1, 0], .09, .035, [57, 48, 25], 77)]
for i in range(11):
    a = i / 11 * 2 * np.pi
    bottom_parts.append(organic_tissue(np.array([.075 * np.cos(a), -1.865 + .018 * np.sin(a * 4), .075 * np.sin(a)]),
        [np.cos(a), -.5, np.sin(a)], .032, .016, [70, 56, 27], 80 + i, segments=16, rings=8))
scene.add_geometry(trimesh.util.concatenate(bottom_parts), node_name='Dry-irregular-floral-end')

target = output / 'pitahaya-amarilla-20261014.glb'
binary = scene.export(file_type='glb', include_normals=True)
json_length = struct.unpack_from('<I', binary, 12)[0]
document = json.loads(binary[20:20 + json_length])
attributes = document['meshes'][0]['primitives'][0]['attributes']
attributes['COLOR_0'] = attributes.pop('_color')
document['accessors'][attributes['COLOR_0']]['normalized'] = True
document['asset']['extras'] = {'provenance': 'docs/design/pitahaya-3d-20261014.json', 'exactScan': False}
encoded = json.dumps(document, separators=(',', ':')).encode()
encoded += b' ' * ((-len(encoded)) % 4)
tail = binary[20 + json_length:]
target.write_bytes(struct.pack('<III', 0x46546c67, 2, 20 + len(encoded) + len(tail)) + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded + tail)
report = {'model': target.name, 'bytes': target.stat().st_size, 'vertices': sum(len(g.vertices) for g in scene.geometry.values()),
    'triangles': sum(len(g.faces) for g in scene.geometry.values()), 'tubercles': len(areoles),
    'photographicSource': {'imagesRegistered': 47, 'points': 8156, 'meanErrorPx': .61173},
    'method': 'Photo-informed profile, individual asymmetric tubercles, dry areoles, repaired organic poles, generated albedo and separate numeric normal/roughness maps.',
    'notAnExactYellowFruitScan': True}
(ROOT / 'prisma/backups/pitahaya-reconstruction/model-build.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(json.dumps(report), flush=True)
