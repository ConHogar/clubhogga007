import os
import datetime
from xml.dom import minidom
import xml.etree.ElementTree as ET

# --- Configuration ---
BASE_URL = "https://club.hogga.cl"
# Get the absolute path of the directory containing this script
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
SITEMAP_PATH = os.path.join(ROOT_DIR, "sitemap.xml")

# Directories and files to exclude from the sitemap
EXCLUDE_DIRS = {'.git', 'partials', 'css', 'js', 'images', 'functions', 'exito', 'validacion', 'db-updates'}
EXCLUDE_FILES = {'404.html', 'og-image.html'}

def generate_sitemap():
    # Create the root element
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

    # Walk through the directory structure
    for dirpath, dirnames, filenames in os.walk(ROOT_DIR):
        # Modify dirnames in-place to skip excluded directories
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]

        for filename in filenames:
            if not filename.endswith('.html'):
                continue
                
            if filename in EXCLUDE_FILES or filename.startswith('test-'):
                continue

            # Get full absolute file path
            filepath = os.path.join(dirpath, filename)
            
            # Calculate the relative path from the root directory
            rel_path = os.path.relpath(filepath, ROOT_DIR)
            
            # Convert file system path to URL path (using forward slashes)
            url_path = rel_path.replace(os.sep, '/')
            
            # Clean up URL logic:
            # If it's index.html at root, it's just '/'
            # If it's folder/index.html, it becomes 'folder/'
            if url_path == 'index.html':
                final_url = BASE_URL + '/'
            elif url_path.endswith('/index.html'):
                final_url = BASE_URL + '/' + url_path[:-10]
            else:
                final_url = BASE_URL + '/' + url_path

            # Get the last modification time of the file
            mtime = os.path.getmtime(filepath)
            lastmod = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')

            # Create <url> element
            url_elem = ET.SubElement(urlset, "url")
            
            # Create <loc> element
            loc_elem = ET.SubElement(url_elem, "loc")
            loc_elem.text = final_url
            
            # Create <lastmod> element
            lastmod_elem = ET.SubElement(url_elem, "lastmod")
            lastmod_elem.text = lastmod

    # Make the XML pretty
    xmlstr = ET.tostring(urlset, encoding='utf-8')
    parsed_xml = minidom.parseString(xmlstr)
    pretty_xml = parsed_xml.toprettyxml(indent="  ")

    # Save to file
    with open(SITEMAP_PATH, "w", encoding="utf-8") as f:
        # minidom adds an extra newline at the beginning, so we write from the first char
        f.write(pretty_xml)
        
    print(f"Sitemap successfully generated at: {SITEMAP_PATH}")
    print(f"Total pages indexed: {len(urlset)}")

if __name__ == "__main__":
    generate_sitemap()
