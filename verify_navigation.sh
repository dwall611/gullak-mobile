#!/bin/bash

echo "=== Gullak Mobile Navigation Verification ==="
echo ""

echo "✓ Checking new screens..."
for screen in SpendingScreen AnalyticsScreen SettingsScreen; do
  if [ -f "src/screens/${screen}.js" ]; then
    echo "  ✓ ${screen}.js exists"
  else
    echo "  ✗ ${screen}.js missing"
  fi
done

echo ""
echo "✓ Checking navigation imports..."
if grep -q "SpendingScreen" src/navigation/AppNavigator.js; then
  echo "  ✓ SpendingScreen imported"
else
  echo "  ✗ SpendingScreen not imported"
fi

if grep -q "AnalyticsScreen" src/navigation/AppNavigator.js; then
  echo "  ✓ AnalyticsScreen imported"
else
  echo "  ✗ AnalyticsScreen not imported"
fi

if grep -q "SettingsScreen" src/navigation/AppNavigator.js; then
  echo "  ✓ SettingsScreen imported"
else
  echo "  ✗ SettingsScreen not imported"
fi

echo ""
echo "✓ Checking archived files..."
OLD_FILES=$(ls src/screens/*.old 2>/dev/null | wc -l)
echo "  Found ${OLD_FILES} archived files"

echo ""
echo "✓ Tab structure in AppNavigator:"
grep "Tab.Screen name=" src/navigation/AppNavigator.js | sed 's/.*name="\([^"]*\)".*/  - \1/'

echo ""
echo "=== Verification Complete ==="
