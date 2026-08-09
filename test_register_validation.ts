import { validate } from "./src/lib/validation"
import { registerValidationSchema } from "./src/validation/register"

function testValidation() {
  console.log("=== Testing Registration Validation Schema ===")

  // Test 1: Standard input with Algerian phone starting with 0
  const input1 = {
    name: "Mohamed",
    email: "mohamed@test.com",
    password: "password123",
    phone: "0555123456"
  }
  validate(input1, registerValidationSchema)
  console.log("✓ Test 1 Passed: Algerian local phone (0555123456)")

  // Test 2: Input without phone (empty string / undefined)
  const input2 = {
    name: "Karim",
    email: "karim@test.com",
    password: "password123",
    phone: ""
  }
  validate(input2, registerValidationSchema)
  console.log("✓ Test 2 Passed: Optional empty phone (\"\")")

  // Test 3: International format phone number
  const input3 = {
    name: "Yassine",
    email: "yassine@test.com",
    password: "password123",
    phone: "+213555123456"
  }
  validate(input3, registerValidationSchema)
  console.log("✓ Test 3 Passed: International phone (+213555123456)")

  console.log("=== ALL REGISTRATION VALIDATION TESTS PASSED 100% ===")
}

testValidation()
