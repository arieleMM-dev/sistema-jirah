"""Local, masked COLMAP diagnostic; never modifies the supplied photographs."""
from pathlib import Path
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'prisma/backups/pitahaya-tools'))
import cv2
import numpy as np
import pycolmap

OUT = ROOT / 'prisma/backups/pitahaya-reconstruction'
for folder in ['input', 'masks', 'sparse']:
    (OUT / folder).mkdir(parents=True, exist_ok=True)

inventory = []
for index, source in enumerate(sorted((ROOT / 'img').glob('*.jpeg'))):
    image = cv2.imread(str(source))
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    seed = ((hsv[:, :, 0] > 125) & (hsv[:, :, 1] > 45) & (hsv[:, :, 2] > 25)).astype(np.uint8) * 255
    seed = cv2.morphologyEx(seed, cv2.MORPH_CLOSE, np.ones((13, 13), np.uint8))
    contours, _ = cv2.findContours(seed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = [c for c in contours if cv2.contourArea(c) > 2000]
    if not candidates:
        continue
    contour = max(candidates, key=cv2.contourArea)
    mask = np.zeros(seed.shape, np.uint8)
    cv2.drawContours(mask, [cv2.convexHull(contour)], -1, 255, -1)
    mask = cv2.dilate(mask, np.ones((15, 15), np.uint8))
    name = f'{index:03}.jpg'
    shutil.copyfile(source, OUT / 'input' / name)
    cv2.imwrite(str(OUT / 'masks' / (name + '.png')), mask)
    grey = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    focus = float(cv2.Laplacian(grey, cv2.CV_64F)[seed > 0].var())
    inventory.append({'name': name, 'source': source.name, 'focus': round(focus, 2), 'maskPixels': int((mask > 0).sum())})
(OUT / 'inventory.json').write_text(json.dumps(inventory, indent=2), encoding='utf8')

database = OUT / 'features.db'
reader = pycolmap.ImageReaderOptions(camera_model='SIMPLE_RADIAL', mask_path=OUT / 'masks')
extraction = pycolmap.FeatureExtractionOptions(max_image_size=1200, num_threads=4)
extraction.sift.max_num_features = 4096
pycolmap.extract_features(database, OUT / 'input', camera_mode=pycolmap.CameraMode.SINGLE,
                         reader_options=reader, extraction_options=extraction, device=pycolmap.Device.cpu)
matching = pycolmap.FeatureMatchingOptions(num_threads=4, guided_matching=True)
pycolmap.match_exhaustive(database, matching_options=matching, device=pycolmap.Device.cpu)
options = pycolmap.IncrementalPipelineOptions(num_threads=4, max_runtime_seconds=180, min_model_size=8, max_num_models=3)
options.mapper.init_min_num_inliers = 60
options.mapper.init_min_tri_angle = 8
options.ba_local_max_num_iterations = 40
options.ba_global_max_num_iterations = 60
models = pycolmap.incremental_mapping(database, OUT / 'input', OUT / 'sparse', options=options)
report = {'inputImages': len(inventory), 'cudaAvailable': pycolmap.has_cuda, 'models': []}
for key, model in models.items():
    model.export_PLY(OUT / f'sparse-{key}.ply')
    report['models'].append({'id': key, 'registeredImages': model.num_reg_images(),
                             'points': model.num_points3D(), 'meanReprojectionError': model.compute_mean_reprojection_error()})
(OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(json.dumps(report), flush=True)
