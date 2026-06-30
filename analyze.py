import zipfile
import xml.etree.ElementTree as ET

def analyze_docx_relationships(docx_path):
    namespaces = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture'
    }
    
    with zipfile.ZipFile(docx_path) as z:
        # Load relationships
        rels_xml = z.read('word/_rels/document.xml.rels')
        rels_root = ET.fromstring(rels_xml)
        rel_map = {}
        for rel in rels_root:
            r_id = rel.get('Id')
            target = rel.get('Target')
            rel_map[r_id] = target
            
        # Load main document
        doc_xml = z.read('word/document.xml')
        doc_root = ET.fromstring(doc_xml)
        
        elements = []
        
        # Helper to find image references in a node
        def find_images(node):
            imgs = []
            for drawing in node.iter('{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}inline'):
                for blip in drawing.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}blip'):
                    embed_id = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                    if embed_id in rel_map:
                        imgs.append(rel_map[embed_id])
            for drawing in node.iter('{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}anchor'):
                for blip in drawing.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}blip'):
                    embed_id = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                    if embed_id in rel_map:
                        imgs.append(rel_map[embed_id])
            return imgs

        # Iterate over paragraphs and tables in the body
        body = doc_root.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}body')
        if body is not None:
            for child in body:
                if child.tag.endswith('}p'):
                    p_text = []
                    for t in child.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                        if t.text:
                            p_text.append(t.text)
                    text = "".join(p_text).strip()
                    imgs = find_images(child)
                    if text or imgs:
                        elements.append(('p', text, imgs))
                elif child.tag.endswith('}tbl'):
                    table_cells = []
                    table_images = []
                    for row in child.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tr'):
                        row_cells = []
                        for cell in row.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tc'):
                            cell_text = "".join([t.text for t in cell.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text]).strip()
                            row_cells.append(cell_text)
                            table_images.extend(find_images(cell))
                        table_cells.append(" | ".join(row_cells))
                    elements.append(('table', "\n".join(table_cells), table_images))
                    
        return elements

if __name__ == '__main__':
    elements = analyze_docx_relationships('Guia clinica.docx')
    with open('docx_analysis.txt', 'w', encoding='utf-8') as f:
        for idx, (el_type, text, imgs) in enumerate(elements):
            f.write(f"--- Element {idx} ({el_type}) ---\n")
            if text:
                f.write(f"Text: {text}\n")
            if imgs:
                f.write(f"Images: {', '.join(imgs)}\n")
            f.write("\n")
    print("Done analysis!")
