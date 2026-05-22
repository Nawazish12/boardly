import { ApiClientError } from "../api/client.js";

export function mapApiErrors(err) {
  if (!(err instanceof ApiClientError)) {
    return { form: "Something went wrong. Please try again." };
  }

  const mapped = {};
  if (err.errors?.length) {
    for (const { field, message } of err.errors) {
      mapped[field] = message;
    }
  }
  mapped.form = err.message;
  return mapped;
}

export function validateRegisterForm({ name, email, password, confirmPassword }) {
  const errors = {};

  if (!name.trim()) {
    errors.name = "Name is required";
  } else if (name.trim().length < 2 || name.trim().length > 100) {
    errors.name = "Name must be between 2 and 100 characters";
  }

  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Please provide a valid email";
  }

  if (!password) {
    errors.password = "Password is required";
  } else {
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/[a-z]/.test(password)) {
      errors.password = "Password must contain at least one lowercase letter";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter";
    } else if (!/\d/.test(password)) {
      errors.password = "Password must contain at least one number";
    }
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

export function validateLoginForm({ email, password }) {
  const errors = {};

  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Please provide a valid email";
  }

  if (!password) {
    errors.password = "Password is required";
  }

  return errors;
}
