#!/bin/bash
# Verify Golden File Testing Setup

echo "🔍 Verifying Golden File Testing Setup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")/.."

ERRORS=0

# Check directory structure
echo ""
echo "1. Checking directory structure..."
if [ -d "scripts" ]; then
    echo "   ✓ scripts/ exists"
else
    echo "   ✗ scripts/ missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "tests" ]; then
    echo "   ✓ tests/ exists"
else
    echo "   ✗ tests/ missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "tests/fixtures" ]; then
    echo "   ✓ tests/fixtures/ exists"
else
    echo "   ✗ tests/fixtures/ missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "tests/fixtures/.golden" ]; then
    echo "   ✓ tests/fixtures/.golden/ exists"
else
    echo "   ✗ tests/fixtures/.golden/ missing (will be created on first run)"
fi

# Check scripts
echo ""
echo "2. Checking scripts..."
if [ -f "scripts/capture-fixtures.js" ]; then
    echo "   ✓ scripts/capture-fixtures.js exists"
    if [ -x "scripts/capture-fixtures.js" ]; then
        echo "   ✓ scripts/capture-fixtures.js is executable"
    else
        echo "   ⚠ scripts/capture-fixtures.js not executable (fix with: chmod +x scripts/capture-fixtures.js)"
    fi
else
    echo "   ✗ scripts/capture-fixtures.js missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "scripts/generate-golden.js" ]; then
    echo "   ✓ scripts/generate-golden.js exists"
    if [ -x "scripts/generate-golden.js" ]; then
        echo "   ✓ scripts/generate-golden.js is executable"
    else
        echo "   ⚠ scripts/generate-golden.js not executable (fix with: chmod +x scripts/generate-golden.js)"
    fi
else
    echo "   ✗ scripts/generate-golden.js missing"
    ERRORS=$((ERRORS + 1))
fi

# Check tests
echo ""
echo "3. Checking tests..."
if [ -f "tests/golden.test.js" ]; then
    echo "   ✓ tests/golden.test.js exists"
    if [ -x "tests/golden.test.js" ]; then
        echo "   ✓ tests/golden.test.js is executable"
    else
        echo "   ⚠ tests/golden.test.js not executable (fix with: chmod +x tests/golden.test.js)"
    fi
else
    echo "   ✗ tests/golden.test.js missing"
    ERRORS=$((ERRORS + 1))
fi

# Check gitignore
echo ""
echo "4. Checking .gitignore..."
if [ -f "tests/fixtures/.gitignore" ]; then
    echo "   ✓ tests/fixtures/.gitignore exists"
    if grep -q "\.golden" tests/fixtures/.gitignore; then
        echo "   ✓ .gitignore includes golden file exception"
    else
        echo "   ⚠ .gitignore missing golden file exception"
    fi
else
    echo "   ✗ tests/fixtures/.gitignore missing"
    ERRORS=$((ERRORS + 1))
fi

# Check package.json scripts
echo ""
echo "5. Checking package.json scripts..."
if [ -f "package.json" ]; then
    echo "   ✓ package.json exists"
    
    if grep -q '"capture:fixtures"' package.json; then
        echo "   ✓ capture:fixtures script exists"
    else
        echo "   ✗ capture:fixtures script missing"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q '"generate:golden"' package.json; then
        echo "   ✓ generate:golden script exists"
    else
        echo "   ✗ generate:golden script missing"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q '"test:golden"' package.json; then
        echo "   ✓ test:golden script exists"
    else
        echo "   ✗ test:golden script missing"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ✗ package.json missing"
    ERRORS=$((ERRORS + 1))
fi

# Check documentation
echo ""
echo "6. Checking documentation..."
if [ -f "tests/fixtures/README.md" ]; then
    echo "   ✓ tests/fixtures/README.md exists"
else
    echo "   ⚠ tests/fixtures/README.md missing (optional but recommended)"
fi

if [ -f "GOLDEN_FILE_TESTING_SUMMARY.md" ]; then
    echo "   ✓ GOLDEN_FILE_TESTING_SUMMARY.md exists"
else
    echo "   ⚠ GOLDEN_FILE_TESTING_SUMMARY.md missing (optional but recommended)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed! Setup is complete."
    echo ""
    echo "Next steps:"
    echo "  1. npm run capture:fixtures    # Capture production data"
    echo "  2. npm run generate:golden     # Generate golden files"
    echo "  3. npm run test:golden         # Run validation tests"
    exit 0
else
    echo "❌ $ERRORS error(s) found. Please fix before proceeding."
    exit 1
fi
