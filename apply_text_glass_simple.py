#!/usr/bin/env python3
"""
Script to add text-glass containers to all text elements in HTML files.
Simpler version without complex regex patterns.
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
    """Apply text-glass wrappers to text elements."""
    
    # Simple replacements without complex look-behinds
    replacements = [
        # Wrap h1 elements
        (r'<h1([^>]*)>(.*?)</h1>', r'<div class="text-glass-title"><h1\1>\2</h1></div>'),
        
        # Wrap h2 elements
        (r'<h2([^>]*)>(.*?)</h2>', r'<div class="text-glass-title"><h2\1>\2</h2></div>'),
        
        # Wrap h3 elements
        (r'<h3([^>]*)>(.*?)</h3>', r'<div class="text-glass-heading"><h3\1>\2</h3></div>'),
        
        # Wrap h4 elements
        (r'<h4([^>]*)>(.*?)</h4>', r'<div class="text-glass-heading"><h4\1>\2</h4></div>'),
        
        # Wrap page-title paragraphs
        (r'<p\s+class="page-title"([^>]*)>(.*?)</p>', r'<div class="text-glass-title"><p class="page-title"\1>\2</p></div>'),
        
        # Wrap section-title h2
        (r'<h2\s+class="section-title"([^>]*)>(.*?)</h2>', r'<div class="text-glass-title"><h2 class="section-title"\1>\2</h2></div>'),
        
        # Wrap team-title h2
        (r'<h2\s+class="team-title"([^>]*)>(.*?)</h2>', r'<div class="text-glass-heading"><h2 class="team-title"\1>\2</h2></div>'),
        
        # Wrap page-sub paragraphs
        (r'<p\s+class="page-sub"([^>]*)>(.*?)</p>', r'<div class="text-glass-block"><p class="page-sub"\1>\2</p></div>'),
        
        # Wrap section-subtitle paragraphs
        (r'<p\s+class="section-subtitle"([^>]*)>(.*?)</p>', r'<div class="text-glass-block"><p class="section-subtitle"\1>\2</p></div>'),
        
        # Wrap lead paragraphs
        (r'<p\s+class="lead"([^>]*)>(.*?)</p>', r'<div class="text-glass-block"><p class="lead"\1>\2</p></div>'),
        
        # Wrap contact-title paragraphs
        (r'<p\s+class="contact-title"([^>]*)>(.*?)</p>', r'<div class="text-glass-title"><p class="contact-title"\1>\2</p></div>'),
        
        # Wrap contact-sub paragraphs
        (r'<p\s+class="contact-sub"([^>]*)>(.*?)</p>', r'<div class="text-glass-block"><p class="contact-sub"\1>\2</p></div>'),
        
        # Wrap about-text paragraphs
        (r'<div\s+class="about-text"(.*?)>(.*?)</div>', r'<div class="text-glass-block about-text"\1>\2</div>'),
    ]
    
    for pattern, replacement in replacements:
        # Avoid double-wrapping
        if f'<div class="text-glass' not in content or not re.search(pattern, content):
            # Safe to apply
            pass
        
        # Simple check to avoid re-wrapping
        original_content = content
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
        # Verify changes were made
        if content != original_content:
            # Check if we created double wrappers
            double_wrapper_pattern = r'<div class="text-glass[^"]*"><div class="text-glass[^"]*"'
            if re.search(double_wrapper_pattern, content):
                # Revert - we created a double wrapper
                content = original_content
    
    return content

def process_file(file_path):
    """Process a single HTML file."""
    filename = os.path.basename(file_path)
    
    if should_exclude_file(filename):
        return None  # Return None for skipped files
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if CSS link exists
        if 'text-containers.css' not in content:
            return None
        
        # Apply transformations
        new_content = apply_text_glass(content)
        
        # Count changes
        original_count = content.count('<div class="text-glass')
        new_count = new_content.count('<div class="text-glass')
        
        changes = new_count - original_count
        
        if changes > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True, changes
        else:
            return False, 0
    
    except Exception as e:
        print(f"Error: {filename}: {e}")
        return False

def main():
    """Main function."""
    print("\n" + "=" * 60)
    print("Applying text-glass containers...")
    print("=" * 60 + "\n")
    
    html_files = sorted(Path(ENG_FOLDER).glob("*.html"))
    
    updated = 0
    total_changes = 0
    
    for file_path in html_files:
        filename = os.path.basename(file_path)
        result = process_file(str(file_path))
        
        if result is None:
            print(f"⊘ Skipped: {filename}")
        elif result is False:
            print(f"✗ Error: {filename}")
        elif result is True:
            updated += 1
            print(f"✓ Updated: {filename}")
        elif isinstance(result, tuple):
            is_updated, changes = result
            if is_updated:
                updated += 1
                total_changes += changes
                print(f"✓ Updated: {filename} (+{changes} wrappers)")
            else:
                print(f"⊘ No changes: {filename}")
    
    print("\n" + "=" * 60)
    print(f"Complete! Updated: {updated} files, Total wrappers added: {total_changes}")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
