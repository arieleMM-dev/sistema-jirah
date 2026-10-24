"""Recover a conservative visual hull and measured profile from registered photos."""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'prisma/backups/pitahaya-tools'))
import cv2
import numpy as np
import pycolmap
from scipy.ndimage import gaussian_filter, label
from skimage.measure import marching_cubes
import trimesh

OUT = ROOT / 'prisma/backups/pitahaya-reconstruction'
model = pycolmap.Reconstruction(OUT / 'sparse/0')
points = np.array([p.xyz for p in model.points3D.values() if p.error < 2 and p.track.length() >= 3])
images = list(model.images.values())
up = np.mean([i.cam_from_world().rotation.matrix().T @ [0, -1, 0] for i in images], axis=0)
up /= np.linalg.norm(up)
right = np.cross(up, [0, 0, 1])
right /= np.linalg.norm(right)
front = np.cross(right, up)
basis = np.array([right, up, front])
local = points @ basis.T
low, high = np.quantile(local, [.005, .995], axis=0)
center = (low + high) / 2
scale = 2.6 / (high[1] - low[1])
local = (local - center) * scale
low, high = np.quantile(local, [.005, .995], axis=0)
padding = (high - low) * .08
low -= padding
high += padding
resolution = 112
axes = [np.linspace(low[j], high[j], resolution) for j in range(3)]
grid = np.stack(np.meshgrid(*axes, indexing='ij'), axis=-1).reshape(-1, 3)
world = (grid / scale + center) @ basis
votes = np.zeros(len(world), np.uint8)
for index, image in enumerate(images):
    pose = image.cam_from_world()
    cam = model.cameras[image.camera_id]
    coords = world @ pose.rotation.matrix().T + pose.translation
    z = coords[:, 2]
    normalized = coords[:, :2] / np.maximum(z[:, None], 1e-8)
    f, cx, cy, k = cam.params
    uv = f * normalized * (1 + k * (normalized ** 2).sum(axis=1)[:, None]) + [cx, cy]
    pixels = np.rint(uv).astype(np.int32)
    valid = (z > 0) & (pixels[:, 0] >= 0) & (pixels[:, 0] < cam.width) & (pixels[:, 1] >= 0) & (pixels[:, 1] < cam.height)
    mask = cv2.imread(str(OUT / 'masks' / (image.name + '.png')), cv2.IMREAD_GRAYSCALE)
    visible = np.zeros(len(world), bool)
    visible[valid] = mask[pixels[valid, 1], pixels[valid, 0]] > 0
    votes += visible
    if index % 10 == 0:
        print('Carving camera', index, flush=True)
volume = (votes >= len(images) - 3).reshape((resolution,) * 3)
components, total = label(volume)
sizes = np.bincount(components.ravel())
sizes[0] = 0
volume = components == sizes.argmax()
field = gaussian_filter(volume.astype(float), 1.1)
vertices, faces, normals, _ = marching_cubes(field, .5, spacing=(high - low) / (resolution - 1))
vertices += low
mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
mesh.export(OUT / 'recovered-volume.glb')
profile = []
for y in np.linspace(np.quantile(vertices[:, 1], .02), np.quantile(vertices[:, 1], .98), 24):
    section = vertices[np.abs(vertices[:, 1] - y) < .06]
    if len(section) > 10:
        profile.append([float(y), float(np.quantile(np.linalg.norm(section[:, [0, 2]], axis=1), .65))])
camera_local = (np.array([i.projection_center() for i in images]) @ basis.T - center) * scale
angles = np.sort(np.mod(np.arctan2(camera_local[:, 2], camera_local[:, 0]), 2 * np.pi))
coverage = 360 - np.rad2deg(np.diff(np.r_[angles, angles[0] + 2 * np.pi]).max())
report = {'profile': profile, 'bounds': mesh.bounds.tolist(), 'vertices': len(vertices), 'triangles': len(faces),
          'cameraAzimuthCoverageDegrees': float(coverage), 'coordinateBasis': basis.tolist(), 'center': center.tolist(), 'scale': float(scale)}
(OUT / 'volume-profile.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(json.dumps(report), flush=True)
