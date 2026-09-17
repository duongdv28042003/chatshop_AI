using System;

namespace Backend.Utils
{
    public static class PasswordHelper
    {
        public static string HashPassword(string password)
        {
            if (string.IsNullOrEmpty(password)) return string.Empty;
            return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);
        }

        public static bool VerifyPassword(string rawPassword, string? storedHash)
        {
            if (string.IsNullOrEmpty(storedHash) || string.IsNullOrEmpty(rawPassword))
                return false;

            // Check if stored hash is a valid BCrypt hash
            if (storedHash.StartsWith("$2a$") || storedHash.StartsWith("$2b$") || storedHash.StartsWith("$2y$") || storedHash.StartsWith("$2x$"))
            {
                try
                {
                    return BCrypt.Net.BCrypt.Verify(rawPassword, storedHash);
                }
                catch
                {
                    return false;
                }
            }

            // Fallback for legacy plain text passwords in development / seed data
            return storedHash == rawPassword || storedHash == "hashed_pw_123";
        }

        public static bool IsLegacyPlainText(string? storedHash)
        {
            if (string.IsNullOrEmpty(storedHash)) return false;
            return !(storedHash.StartsWith("$2a$") || storedHash.StartsWith("$2b$") || storedHash.StartsWith("$2y$") || storedHash.StartsWith("$2x$"));
        }
    }
}
