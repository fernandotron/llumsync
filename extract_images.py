import os
import zipfile

def extract_docx_images(docx_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    with zipfile.ZipFile(docx_path) as z:
        image_files = [f for f in z.namelist() if f.startswith('word/media/')]
        print(f"Found {len(image_files)} images in docx:")
        for img_path in image_files:
            basename = os.path.basename(img_path)
            dest = os.path.join(out_dir, basename)
            with z.open(img_path) as f_in, open(dest, 'wb') as f_out:
                f_out.write(f_in.read())
            print(f"Extracted {basename} to {dest}")

if __name__ == '__main__':
    artifact_dir = r"C:\Users\Fer\.gemini\antigravity-ide\brain\c6cb6b3a-9d34-4a97-830f-88d14898934d"
    extract_docx_images('Guia clinica.docx', artifact_dir)
