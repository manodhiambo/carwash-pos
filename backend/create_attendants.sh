#!/bin/bash

API_URL="https://carwash-pos.onrender.com/api/v1"

# Login as manager to get token
echo "Logging in as manager..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "lkwodi.lk@gmail.com",
    "password": "Lorna@2026"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login"
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Create 7 attendants
ATTENDANTS=(
  "John Opiyo|attendant1@carwashpro.co.ke|Attendant1@2026|0794179950"
  "Mary Akinyi|attendant2@carwashpro.co.ke|Attendant2@2026|0723456789"
  "Peter Otieno|attendant3@carwashpro.co.ke|Attendant3@2026|0712345678"
  "Grace Wanjiru|attendant4@carwashpro.co.ke|Attendant4@2026|0798765432"
  "James Kamau|attendant5@carwashpro.co.ke|Attendant5@2026|0745678901"
  "Nancy Njeri|attendant6@carwashpro.co.ke|Attendant6@2026|0734567890"
  "David Mwangi|attendant7@carwashpro.co.ke|Attendant7@2026|0756789012"
)

echo "Creating 7 attendants..."
echo "========================="
echo ""

for attendant in "${ATTENDANTS[@]}"; do
  IFS='|' read -r name email password phone <<< "$attendant"
  
  echo "Creating: $name ($email)"
  
  RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"name\": \"$name\",
      \"email\": \"$email\",
      \"password\": \"$password\",
      \"phone\": \"$phone\",
      \"role\": \"attendant\",
      \"branch_id\": 1
    }")
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ $name created successfully"
  else
    echo "❌ Failed to create $name"
    echo "Response: $RESPONSE"
  fi
  echo ""
done

echo "========================="
echo "✅ All attendants created!"
echo ""
echo "ATTENDANT CREDENTIALS:"
echo "======================"
echo "1. John Opiyo - attendant1@carwashpro.co.ke (Attendant1@2026)"
echo "2. Mary Akinyi - attendant2@carwashpro.co.ke (Attendant2@2026)"
echo "3. Peter Otieno - attendant3@carwashpro.co.ke (Attendant3@2026)"
echo "4. Grace Wanjiru - attendant4@carwashpro.co.ke (Attendant4@2026)"
echo "5. James Kamau - attendant5@carwashpro.co.ke (Attendant5@2026)"
echo "6. Nancy Njeri - attendant6@carwashpro.co.ke (Attendant6@2026)"
echo "7. David Mwangi - attendant7@carwashpro.co.ke (Attendant7@2026)"
echo ""
