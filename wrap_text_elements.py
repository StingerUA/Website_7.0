#!/usr/bin/env python3
"""
Advanced script to wrap text elements in HTML files with glass containers.
This script handles various HTML structures and wraps common text elements.
"""

import os
import re
from pathlib import Path

ENG_FOLDER = "/workspaces/Website_7.0/eng"

# Files that have already been manually updated or should be skipped
ALREADY_UPDATED = {
    "iletisim.html",
    "index.html",
    "hakkimizda.html",
}

EXCLUDE_FILES = {
    "cart.html",
    "shop.html",
    "blog copy.html",
    "account-menu.html",
}

EXCLUDE_PATTERNS = [
    r"^product-.*\.html$",
    r"^shop\.html$",
    r"^cart\.html$",
]

def should_skip_file(filename):
    """Check if a file should be skipped."""
    if filename in EXCLUDE_FILES or filename in ALREADY_UPDATED:
        return True
    
    for pattern in EXCLUDE_PATTERNS:
        if re.match(pattern, filename):
            return True
    
    return False

def wrap_h1_elements(content):
    """Wrap h1 elements with text-glass-title."""
    # Pattern to find h1 elements not already wrapped
    pattern = r'(?<!<div[^>]*class="[^"]*text-glass[^"]*"[^>]*>)\s*<h1([^>]*)>(.*?)</h1>'
    replacement = r'<div class="text-glass-title"><h1\1>\2</h1></div>'
    return re.sub(pattern, replacement, content, flags=re.DOTALL)

def wrap_h2_elements(content):
    """Wrap h2 elements with text-glass-title."""
    pattern = r'(?<!<div[^>]*class="[^"]*text-glass[^"]*"[^>]*>)\s*<h2([^>]*)>(.*?)</h2>'
    replacement = r'<div class="text-glass-title"><h2\1>\2</h2></div>'
    return re.sub(pattern, replacement, content, flags=re.DOTALL)

def wrap_h3_elements(content):
    """Wrap h3 elements with text-glass-heading."""
    # But preserve existing structure for team cards, etc.
    pattern = r'<h3([^>]*)>(.*?)</h3>'
    
    def replacer(match):
        # Don't wrap if already inside a wrapper
        attrs = match.group(1)
        text = match.group(2)
        return f'<div class="text-glass-heading"><h3{attrs}>{text}</h3></div>'
    
    # Simple replacement - only if not already wrapped
    lines = content.split('\n')
    result = []
    for line in lines:
        if '<h3' in line and 'text-glass' not in line and '</h3>' in line:
            # Wrap this h3
            line = re.sub(r'<h3([^>]*)>(.*?)</h3>', 
                         r'<div class="text-glass-heading"><h3\1>\2</h3></div>', 
                         line)
        result.append(line)
    return '\n'.join(result)

def wrap_section_titles(content):
    """Wrap section titles (classes like page-title, section-title) with glass containers."""
    replacements = [
        # Wrap .page-title paragraphs
        (r'<p class="page-title"(.*?)>(.*?)</p>', 
         r'<div class="text-glass-title"><p class="page-title"\1>\2</p></div>'),
        
        # Wrap .section-title h2
        (r'<h2 class="section-title"(.*?)>(.*?)</h2>',
         r'<div class="text-glass-title"><h2 class="section-title"\1>\2</h2></div>'),
        
        # Wrap .team-title h2
        (r'<h2 class="team-title"(.*?)>(.*?)</h2>',
         r'<div class="text-glass-heading"><h2 class="team-title"\1>\2</h2></div>'),
    ]
    
    for pattern, replacement in replacements:
        # Skip if already wrapped
        if 'text-glass' not in content or pattern not in content:
            content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    return content

def wrap_paragraphs(content):
    """Wrap standalone paragraphs with glass containers where appropriate."""
    lines = content.split('\n')
    result = []
    
    for line in lines:
        # Skip lines with special classes that shouldn't be wrapped
        skip_classes = ['hero-stats', 'footer', 'cookie', 'button', 'form', 'logo-section']
        if any(skip_class in line for skip_class in skip_classes):
            result.append(line)
            continue
        
        # Wrap paragraph elements that are standalone
        if '<p' in line and 'class=' in line and 'text-glass' not in line:
            if any(cls in line for cls in ['page-sub', 'section-subtitle', 'lead', 'contact-sub']):
                # These are meant to be subtitle-like paragraphs
                line = re.sub(r'(<p\s+[^>]*(?:page-sub|section-subtitle|lead|contact-sub)[^>]*)>(.*?)</p>',
                             r'<div class="text-glass-block">\1>\2</p></div>',
                             line)
        
        result.append(line)
    
    return '\n'.join(result)

def process_file(file_path):
    """Process a single HTML file."""
    filename = os.path.basename(file_path)
    
    if should_skip_file(filename):
        return False
    
    print(f"Processing: {filename}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file has text-containers.css link
        if 'text-containers.css' not in content:
            print(f"  ⚠ Skipping: {filename} - CSS link not found")
            return False
        
        # Apply wrapping transformations
        # content = wrap_h1_elements(content)
        # content = wrap_h2_elements(content)
        # content = wrap_h3_elements(content)
        content = wrap_section_titles(content)
        # content = wrap_paragraphs(content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  ✓ Updated: {filename}")
        return True
    
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def main():
    """Process all HTML files."""
    print("\n" + "=" * 60)
    print("Wrapping text elements with glass containers...")
    print("=" * 60 + "\n")
    
    html_files = sorted(Path(ENG_FOLDER).glob("*.html"))
    
    updated = 0
    for file_path in html_files:
        if process_file(str(file_path)):
            updated += 1
    
    print("\n" + "=" * 60)
    print(f"Processing complete! Updated: {updated} files")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
