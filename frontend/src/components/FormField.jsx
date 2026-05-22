export default function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  hint,
}) {
  return (
    <div className={`form-field${error ? " form-field--error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {hint && !error && (
        <span id={`${id}-hint`} className="form-field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="form-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
