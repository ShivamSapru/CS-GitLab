#!/usr/bin/env python3
"""
Test data validation and setup script
Ensures all required test files are present and valid
"""

import os
import sys
from pathlib import Path

def validate_test_data():
    """Validate that all required test data files exist and are valid"""
    
    # Define required test files
    test_data_dir = Path(__file__).parent / "sample-data"
    required_files = {
        "MIB2-subtitles-pt-BR.vtt": {
            "type": "vtt",
            "min_size": 100,  # bytes
            "description": "Portuguese subtitle file for translation testing"
        },
        "MIB2.mp4": {
            "type": "mp4", 
            "min_size": 1000,  # bytes
            "description": "Video file for transcription testing"
        }
    }
    
    print(f"🔍 Validating test data in: {test_data_dir.absolute()}")
    print("-" * 60)
    
    all_valid = True
    
    for filename, requirements in required_files.items():
        file_path = test_data_dir / filename
        print(f"\n📁 Checking: {filename}")
        print(f"   Description: {requirements['description']}")
        
        # Check existence
        if not file_path.exists():
            print(f"   ❌ File not found: {file_path}")
            all_valid = False
            continue
            
        # Check size
        file_size = file_path.stat().st_size
        if file_size < requirements['min_size']:
            print(f"   ❌ File too small: {file_size} bytes (min: {requirements['min_size']})")
            all_valid = False
            continue
            
        print(f"   ✅ Exists: {file_size:,} bytes")
        
        # Type-specific validation
        if requirements['type'] == 'vtt':
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if not content.startswith('WEBVTT'):
                        print(f"   ⚠️  Warning: VTT file doesn't start with 'WEBVTT'")
                    else:
                        print(f"   ✅ VTT format valid")
            except Exception as e:
                print(f"   ❌ Error reading VTT file: {e}")
                all_valid = False
                
        elif requirements['type'] == 'mp4':
            # Basic MP4 validation - check file signature
            try:
                with open(file_path, 'rb') as f:
                    header = f.read(8)
                    if b'ftyp' in header:
                        print(f"   ✅ MP4 format valid")
                    else:
                        print(f"   ⚠️  Warning: File may not be a valid MP4")
            except Exception as e:
                print(f"   ❌ Error reading MP4 file: {e}")
    
    print("\n" + "=" * 60)
    if all_valid:
        print("✅ All test data files are valid and ready for testing!")
        return 0
    else:
        print("❌ Some test data files are missing or invalid.")
        print("\n💡 To fix missing files:")
        print("   - Run this script to see what's missing")
        print("   - Check the sample-data directory")
        print("   - Ensure files meet minimum size requirements")
        return 1

def create_missing_files():
    """Create any missing test data files with sample content"""
    test_data_dir = Path(__file__).parent / "sample-data"
    test_data_dir.mkdir(exist_ok=True)
    
    # Create sample VTT file if missing
    vtt_file = test_data_dir / "MIB2-subtitles-pt-BR.vtt"
    if not vtt_file.exists():
        print(f"🔧 Creating sample VTT file: {vtt_file}")
        vtt_content = """WEBVTT

1
00:00:01.000 --> 00:00:04.000
Olá, bem-vindos ao nosso teste de tradução.

2
00:00:05.000 --> 00:00:09.000
Este é um arquivo de legendas em português brasileiro.

3
00:00:10.000 --> 00:00:14.000
Vamos testar se a tradução funciona corretamente.

4
00:00:15.000 --> 00:00:19.000
O sistema deve traduzir estas legendas para o inglês.

5
00:00:20.000 --> 00:00:24.000
Este é um teste automatizado da funcionalidade.

6
00:00:25.000 --> 00:00:29.000
Esperamos que tudo funcione perfeitamente.

7
00:00:30.000 --> 00:00:34.000
Obrigado por usar nosso sistema de tradução.

8
00:00:35.000 --> 00:00:38.000
Fim do teste de legendas."""
        
        with open(vtt_file, 'w', encoding='utf-8') as f:
            f.write(vtt_content)
        print(f"✅ Created: {vtt_file}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "create":
        create_missing_files()
    
    exit_code = validate_test_data()
    sys.exit(exit_code)
