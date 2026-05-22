#!/usr/bin/env python3
"""
Script to add text glass containers to all HTML pages in /eng/ directory.
Wraps text elements (h1, h2, h3, h4, h5, h6, p, span, label, etc.) 
with glass container divs.
"""

import os
import re
from pathlib import Path
from bs4 import BeautifulSoup

# Configuration
ENG_FOLDER = "/workspaces/Website_7.0/eng"
EXCLUDE_FILES = {
    "cart.html",
    "shop.html",
    "blog copy.html",  # Backup file
    "account-menu.html",  # Navigation component
}

# Files to exclude that match patterns
EXCLUDE_PATTERNS = [
    r"^product-.*\.html$",
    r"^shop\.html$",
    r"^cart\.html$",
]

CSS_LINK = '<link href="/assets/css/text-containers.css" rel="stylesheet">'

def should_exclude_file(filename):
    """Check if a file should be excluded from processing."""
    if filename in EXCLUDE_FILES:
        return True
    
    for pattern in EXCLUDE_PATTERNS:
        if re.match(pattern, filename):
            return True
    
    return False

def add_css_link_to_head(html_content):
    """Add the text-containers.css link to the <head> section if not already present."""
    if "text-containers.css" in html_content:
        return html_content
    
    # Find the closing </head> tag
    head_close = html_content.find("</head>")
    if head_close == -1:
        return html_content
    
    # Insert the CSS link before </head>
    insert_pos = head_close
    return html_content[:insert_pos] + CSS_LINK + "\n" + html_content[insert_pos:]

def wrap_text_elements(html_content):
    """
    Wrap text content elements in glass containers.
    Be careful not to wrap:
    - Already wrapped elements
    - Script/style content
    - Empty elements
    - Data attributes content
    """
    try:
        soup = BeautifulSoup(html_content, "html.parser")
        
        # Find all text elements to wrap
        text_tags = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "label"])
        
        processed = set()  # Track processed elements to avoid double-wrapping
        
        for element in text_tags:
            # Skip if already wrapped
            if element.parent and element.parent.name == "div":
                parent_class = element.parent.get("class", [])
                if any("text-glass" in str(c) for c in parent_class):
                    continue
            
            # Skip empty or very short elements
            text = element.get_text(strip=True)
            if not text or len(text) < 3:
                continue
            
            # Skip if it's inside a script or style tag
            if element.find_parent(["script", "style"]):
                continue
            
            # Skip if element ID already processed
            element_id = id(element)
            if element_id in processed:
                continue
            
            # Determine appropriate glass class based on tag
            if element.name in ["h1", "h2"]:
                glass_class = "text-glass-title"
            elif element.name in ["h3", "h4"]:
                glass_class = "text-glass-heading"
            elif element.name == "label":
                glass_class = "text-glass-small"
            else:
                glass_class = "text-glass-block"
            
            # Create wrapper div
            wrapper = soup.new_tag("div", attrs={"class": glass_class})
            
            # Clone the element
            element_copy = element
            element.replace_with(wrapper)
            wrapper.append(element_copy)
            
            processed.add(element_id)
        
        return str(soup.prettify())
    
    except Exception as e:
        print(f"  Warning: Error parsing HTML: {e}")
        return html_content

def process_html_file(file_path):
    """Process a single HTML file."""
    filename = os.path.basename(file_path)
    
    print(f"Processing: {filename}")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Add CSS link
        content = add_css_link_to_head(content)
        
        # Wrap text elements (commented out for now - manual review needed)
        # content = wrap_text_elements(content)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"  ✓ Updated: {filename}")
        return True
    
    except Exception as e:
        print(f"  ✗ Error processing {filename}: {e}")
        return False

def main():
    """Main function to process all HTML files in /eng/ folder."""
    print("=" * 60)
    print("Updating HTML files with text glass containers...")
    print("=" * 60)
    
    if not os.path.exists(ENG_FOLDER):
        print(f"Error: {ENG_FOLDER} does not exist")
        return
    
    # Get all HTML files
    html_files = sorted(Path(ENG_FOLDER).glob("*.html"))
    
    if not html_files:
        print("No HTML files found")
        return
    
    updated = 0
    skipped = 0
    errors = 0
    
    for file_path in html_files:
        filename = file_path.name
        
        if should_exclude_file(filename):
            print(f"Skipping: {filename} (excluded)")
            skipped += 1
            continue
        
        if process_html_file(str(file_path)):
            updated += 1
        else:
            errors += 1
    
    print("\n" + "=" * 60)
    print(f"Processing complete!")
    print(f"  Updated: {updated}")
    print(f"  Skipped: {skipped}")
    print(f"  Errors: {errors}")
    print("=" * 60)

if __name__ == "__main__":
    main()
