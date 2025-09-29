#!/bin/bash

# Script to center all headings in React components

echo "🎯 Centering headings in all components..."

COMPONENTS_DIR="/app/frontend/src/components"

# List of components to update
components=(
  "GuestManagement.js"
  "MaintenanceSystem.js"
  "EventsAnnouncements.js"
  "NotificationCenter.js"
  "Settings.js"
  "SmartHomeIntegration.js"
  "VotingSystem.js"
  "DocumentManagement.js"
  "ServiceBooking.js"
  "ServicesManagement.js"
  "FinancialManagement.js"
  "MessageCenter.js"
  "Newsletter.js"
  "ContactUs.js"
  "Pricing.js"
  "EnterpriseRegistration.js"
  "EnterpriseDashboard.js"
)

for component in "${components[@]}"; do
  if [ -f "$COMPONENTS_DIR/$component" ]; then
    echo "📝 Processing $component..."
    
    # Add text-center class to h1 headings
    sed -i 's/className="\([^"]*\)text-[0-9]xl[^"]*font-bold[^"]*"/className="\1text-center &"/g' "$COMPONENTS_DIR/$component"
    
    # Add text-center to h2 headings
    sed -i 's/className="\([^"]*\)text-[0-9]xl[^"]*font-[^"]*"/className="\1text-center &"/g' "$COMPONENTS_DIR/$component"
    
    # More specific patterns for major headings
    sed -i 's/className="text-3xl font-bold text-gray-900"/className="text-3xl font-bold text-gray-900 text-center"/g' "$COMPONENTS_DIR/$component"
    sed -i 's/className="text-2xl font-bold text-gray-900"/className="text-2xl font-bold text-gray-900 text-center"/g' "$COMPONENTS_DIR/$component"
    sed -i 's/className="text-4xl font-bold text-gray-900"/className="text-4xl font-bold text-gray-900 text-center"/g' "$COMPONENTS_DIR/$component"
    
    echo "✅ Updated $component"
  else
    echo "⚠️  $component not found"
  fi
done

echo "🎉 All headings have been centered!"