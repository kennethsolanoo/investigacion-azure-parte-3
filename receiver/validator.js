const REQUIRED_FIELDS = ["messageId", "sentAt", "sender", "subject", "description", "createdBy"];
const EXPECTED_SENDER = "AplicacionEmisora";
const EXPECTED_CREATED_BY = "Kenneth";
const EXPECTED_CONTENT_TYPE = "application/json";
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidIsoDate(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  if (!ISO_UTC_PATTERN.test(value)) {
    return false;
  }

  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
}

function addIssue(issues, field, reason) {
  issues.push({ field, reason });
}

function validateReceivedMessage(message) {
  const issues = [];
  const body = message?.body;
  const azureMessageId = message?.messageId;
  const contentType = message?.contentType;

  if (!isPlainObject(body)) {
    addIssue(issues, "body", "El cuerpo del mensaje debe ser un objeto JSON.");
    return {
      valid: false,
      issues,
      reasons: issues.map((issue) => `${issue.field}: ${issue.reason}`)
    };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(body, field) || body[field] === null) {
      addIssue(issues, field, "Campo obligatorio ausente o vacio.");
    } else if (typeof body[field] === "string" && body[field].trim() === "") {
      addIssue(issues, field, "Campo obligatorio ausente o vacio.");
    }
  }

  for (const field of REQUIRED_FIELDS) {
    if (body[field] !== undefined && body[field] !== null && typeof body[field] !== "string") {
      addIssue(issues, field, "El campo debe ser una cadena de texto.");
    }
  }

  if (typeof body.messageId === "string" && !UUID_V4_PATTERN.test(body.messageId)) {
    addIssue(issues, "messageId", "Debe tener formato UUID v4 valido.");
  }

  if (typeof body.sentAt === "string" && !isValidIsoDate(body.sentAt)) {
    addIssue(issues, "sentAt", "Debe contener una fecha ISO 8601 valida.");
  }

  if (typeof body.sender === "string" && body.sender !== EXPECTED_SENDER) {
    addIssue(issues, "sender", `Debe ser ${EXPECTED_SENDER}.`);
  }

  if (typeof body.subject === "string" && body.subject.trim() === "") {
    addIssue(issues, "subject", "Debe ser una cadena no vacia.");
  }

  if (typeof body.description === "string" && body.description.trim() === "") {
    addIssue(issues, "description", "Debe ser una cadena no vacia.");
  }

  if (typeof body.createdBy === "string" && body.createdBy !== EXPECTED_CREATED_BY) {
    addIssue(issues, "createdBy", `Debe ser ${EXPECTED_CREATED_BY}.`);
  }

  if (contentType !== EXPECTED_CONTENT_TYPE) {
    addIssue(issues, "contentType", `Debe ser ${EXPECTED_CONTENT_TYPE}.`);
  }

  if (azureMessageId !== body.messageId) {
    addIssue(issues, "azureMessageId", "Debe coincidir con body.messageId.");
  }

  return {
    valid: issues.length === 0,
    issues,
    reasons: issues.map((issue) => `${issue.field}: ${issue.reason}`)
  };
}

module.exports = {
  EXPECTED_CONTENT_TYPE,
  EXPECTED_CREATED_BY,
  EXPECTED_SENDER,
  REQUIRED_FIELDS,
  validateReceivedMessage
};
