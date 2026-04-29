/*
 * Validation schema for registration action
 */

import { ValidationSchema, rules } from "@/lib/validation"
import { RegisterInput } from "@/types/register"

export const registerValidationSchema: ValidationSchema<RegisterInput> = {
  email: [
    rules.required("Email is required"),
    rules.email("Must be a valid email address")
  ],
  password: [
    rules.required("Password is required"),
    rules.minLength(6, "Password must be at least 6 characters long")
  ],
  name: [
    rules.required("Name is required"),
    rules.minLength(1, "Name must be at least 1 character long")
  ],
  phone: [
    rules.required("Phone number is required"),
    rules.phone("Must be a valid phone number")
  ]
}