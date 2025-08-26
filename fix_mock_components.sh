#!/bin/bash
# Quick fix for mock component casing

cd /app

# Fix Profile test
sed -i 's/<mockProfile/<MockProfile/g' tests/web-app/frontend-tests/components/components/Profile.test.jsx
sed -i 's/const mockProfile/const MockProfile/g' tests/web-app/frontend-tests/components/components/Profile.test.jsx

# Fix Library test  
sed -i 's/<mockLibrary/<MockLibrary/g' tests/web-app/frontend-tests/components/components/Library.test.jsx
sed -i 's/const mockLibrary/const MockLibrary/g' tests/web-app/frontend-tests/components/components/Library.test.jsx

# Fix LoginModal test
sed -i 's/<mockLoginModal/<MockLoginModal/g' tests/web-app/frontend-tests/components/components/LoginModal.test.jsx
sed -i 's/const mockLoginModal/const MockLoginModal/g' tests/web-app/frontend-tests/components/components/LoginModal.test.jsx

# Fix SignupModal test
sed -i 's/<mockSignupModal/<MockSignupModal/g' tests/web-app/frontend-tests/components/components/SignupModal.test.jsx
sed -i 's/const mockSignupModal/const MockSignupModal/g' tests/web-app/frontend-tests/components/components/SignupModal.test.jsx

# Fix StaticSubtitleUpload test
sed -i 's/<mockStaticSubtitleUpload/<MockStaticSubtitleUpload/g' tests/web-app/frontend-tests/components/components/StaticSubtitleUpload.test.jsx
sed -i 's/const mockStaticSubtitleUpload/const MockStaticSubtitleUpload/g' tests/web-app/frontend-tests/components/components/StaticSubtitleUpload.test.jsx

echo "Fixed all mock component names to PascalCase"
