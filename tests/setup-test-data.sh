#!/bin/bash
# setup-test-data.sh
# Script to ensure test data is available in CI/CD environments

set -e

echo "Setting up test data for CI/CD..."

# Navigate to tests directory
cd "$(dirname "$0")"

# Create sample-data/input directory if it doesn't exist
mkdir -p sample-data/input

# Check if VTT file exists, create if missing
if [ ! -f "sample-data/input/MIB2-subtitles-pt-BR.vtt" ]; then
    echo "📝 Creating sample VTT subtitle file..."
    cat > sample-data/input/MIB2-subtitles-pt-BR.vtt << 'EOF'
WEBVTT

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
Fim do teste de legendas.
EOF
    echo "VTT file created successfully"
else
    echo "VTT file already exists"
fi

# Validate test data if validation script exists
if [ -f "validate_test_data.py" ]; then
    echo "Validating test data..."
    python validate_test_data.py
else
    echo "Verifying test files manually..."
    ls -la sample-data/input/
    if [ -f "sample-data/input/MIB2-subtitles-pt-BR.vtt" ]; then
        echo "📄 VTT file content preview:"
        head -5 sample-data/input/MIB2-subtitles-pt-BR.vtt
    fi
fi

echo "Test data setup complete!"
