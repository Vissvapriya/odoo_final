/**
 * Helper to record audit logs in the database.
 * Supports storing old and new values for changes.
 */
async function logAudit(prisma, { tableName, recordId, action, oldValue = null, newValue = null, userId = null }) {
  try {
    // Basic sanitization: remove passwords or sensitive info before logging
    const sanitize = (val) => {
      if (!val) return val;
      const copy = { ...val };
      delete copy.password;
      delete copy.passwordHash;
      return copy;
    };

    await prisma.auditLog.create({
      data: {
        tableName,
        recordId,
        action,
        oldValue: oldValue ? sanitize(oldValue) : null,
        newValue: newValue ? sanitize(newValue) : null,
        userId: userId || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

module.exports = { logAudit };
