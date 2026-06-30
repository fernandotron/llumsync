import zipfile
import xml.etree.ElementTree as ET

def get_docx_text(docx_path):
    try:
        with zipfile.ZipFile(docx_path) as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            text_runs = []
            # Traverse the tree in order
            for elem in root.iter():
                # Paragraph element
                if elem.tag.endswith('}p'):
                    text_runs.append('\n')
                # Text element
                elif elem.tag.endswith('}t'):
                    if elem.text:
                        text_runs.append(elem.text)
                # Tab element
                elif elem.tag.endswith('}tab'):
                    text_runs.append('\t')
                # Table cell element
                elif elem.tag.endswith('}tc'):
                    text_runs.append(' | ')
                # Table row element
                elif elem.tag.endswith('}tr'):
                    text_runs.append('\n')
            
            return "".join(text_runs)
    except Exception as e:
        return f"Error: {e}"

if __name__ == '__main__':
    text = get_docx_text('Guia clinica.docx')
    with open('guia_clinica.txt', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Extracted clinical guide text.")
