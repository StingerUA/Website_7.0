#!/usr/bin/env python3
"""
Script to add text-glass containers to all text elements in HTML files.
This is the corrected version that actually applies the wrappers.
"""

import os
import re
from pathlib import Path

ENG_FOLDER = "/workspaces/Website_7.0/eng"

EXCLUDE_FILES = {
    "cart.html",
    "shop.html",
    "blog copy.html",
    "account-menu.html",
}

EXCLUDE_PATTERNS = [
    r"^product-.*\.html$",
]

def should_exclude_file(filename):
    """Check if a file should be excluded."""
    if filename in EXCLUDE_FILES:
        return True
    for pattern in EXCLUDE_PATTERNS:
        if re.match(pattern, filename):
            return True
    return False

def apply_text_glass(content):
    """Apply text-glass wrappers to various text elements."""
    
    # 1. Wrap h1 elements
    content = re.sub(
        r'(?<!<div[^>]*class="[^"]*text-glass[^"]*"[^>]*>)\s*<h1([^>]*)>(.*?)</h1>',
        r'<div class="text-glass-title"><h1\1>\2</h1></div>',
        content,
        flags=re.DOTALL
    )
    
    # 2. Wrap h2 elements (but not if already wrapped)
    content = re.sub(
        r'(?<!<div[^>]*class="[^"]*text-glass[^"]*"[^>]*>)\s*<h2([^>]*)>(.*?)</h2>',
        r'<div class="text-glass-title"><h2\1>\2</h2></div>',
        content,
        flags=re.DOTALL
    )
    
    # 3. Wrap h3 elements
    content = re.sub(
        r'(?<!<div[^>]*class="[^"]*text-glass[^"]*"[^>]*>)\s*<h3([^>]*)>(.*?)</h3>',
        r'<div class="text-glass-heading"><h3\1>\2</h3></div>',
        content,
        flags=re.DOTALL
    )
    
    # 4. Wrap h4 elements
    content = re.sub(
        r'(?<!<div[^>]*class="[^"]*text-glass[^"]*"[^>]*>)\s*<h4([^>]*)>(.*?)</h4>',
        r'<div class="text-glass-heading"><h4\1>\2</h4></div>',
        content,
        flags=re.DOTALL
    )
    
    # 5. Wrap specific paragraph classes: page-title, page-sub, section-title, section-subtitle, lead, contact-title, contact-sub
    paragraph_classes = [
        'page-title', 'page-sub', 'section-title', 'section-subtitle', 
        'lead', 'contact-title', 'contact-sub', 'about-text'
    ]
    
    for pclass in paragraph_classes:
        # For classes that should be title-like
        if pclass in ['page-title', 'section-title', 'contact-title']:
            content = re.sub(
                rf'(?<!<div[^>]*class="[^"]*text-glass[^"]*"[^>]*>)\s*<p\s+class="{pclass}"([^>]*)>(.*?)</p>',
                rf'<div class="text-glass-title"><p class="{pclass}"\1>\2</p></div>',
                content,
                flags=re.DOTALL
            )
        else:
            # For subtitle/lead classes
            content = re.sub(
                rf'(?<!<div[^>]*class="[^"]*text-glass[^"]*"[^>]*>)\s*<p\s+class="{pclass}"([^>]*)>(.*?)</p>',
                rf'<div class="text-glass-block"><p class="{pclass}"\1>\2</p></div>',
                content,
                flags=re.DOTALL
            )
    
    # 6. Wrap label elements
    content = re.sub(
        r'(?<!<div[^>]*class="[^"]*text-glass[^"]*"[^>]*>)\s*<label([^>]*)>(.*?)</label>',
        r'<div class="text-glass-small"><label\1>\2</label></div>',
        content,
        flags=re.DOTALL
    )
    
    return content

def process_file(file_path):
    """Process a single HTML file."""
    filename = os.path.basename(file_path)
    
    if should_exclude_file(filename):
        print(f"Skipping: {filename}")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if CSS link exists
        if 'text-containers.css' not in content:
            print(f"Skipping: {filename} - CSS link not found")
            return False
        
        # Apply transformations
        new_content = apply_text_glass(content)
        
        # Only write if content changed
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ Updated: {filename}")
            return True
        else:
            print(f"⊘ No changes: {filename}")
            return False
    
    except Exception as e:
        print(f"✗ Error processing {filename}: {e}")
        return False

def main():
    """Main function."""
    print("\n" + "=" * 60)
    print("Applying text-glass containers to all files...")
    print("=" * 60 + "\n")
    
    html_files = sorted(Path(ENG_FOLDER).glob("*.html"))
    
    updated = 0
    skipped = 0
    
    for file_path in html_files:
        if process_file(str(file_path)):
            updated += 1
        else:
            skipped += 1
    
    print("\n" + "=" * 60)
    print(f"Complete! Updated: {updated}, Skipped: {skipped}")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
