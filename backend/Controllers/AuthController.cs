using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

using Backend.Utils;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        public class LoginDto
        {
            public string Identifier { get; set; } = string.Empty;
            public string? Email { get; set; }
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var key = (string.IsNullOrWhiteSpace(dto.Identifier) ? dto.Email ?? "" : dto.Identifier).Trim().ToLower();
            if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Vui lòng nhập tài khoản và mật khẩu." });
            }

            var staff = await _context.Staff.FirstOrDefaultAsync(s => s.Email.ToLower() == key);
            if (staff != null)
            {
                if (!PasswordHelper.VerifyPassword(dto.Password, staff.PasswordHash))
                {
                    return Unauthorized(new { message = "Mật khẩu không chính xác." });
                }

                // Seamlessly migrate legacy plain text to BCrypt hash
                if (PasswordHelper.IsLegacyPlainText(staff.PasswordHash))
                {
                    staff.PasswordHash = PasswordHelper.HashPassword(dto.Password);
                    staff.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                var token = Guid.NewGuid().ToString("N");
                return Ok(new
                {
                    accessToken = token,
                    role = staff.Role,
                    user = new
                    {
                        id = staff.Id,
                        email = staff.Email,
                        fullName = staff.FullName ?? "Nhân viên",
                        role = staff.Role,
                        isActive = staff.IsActive,
                    },
                    staff = new
                    {
                        id = staff.Id,
                        email = staff.Email,
                        fullName = staff.FullName ?? "Nhân viên",
                        role = staff.Role,
                        isActive = staff.IsActive,
                    }
                });
            }

            var customer = await _context.Customers.FirstOrDefaultAsync(c =>
                c.Phone == key || (c.Email != null && c.Email.ToLower() == key)
            );

            if (customer != null)
            {
                if (!PasswordHelper.VerifyPassword(dto.Password, customer.PasswordHash))
                {
                    return Unauthorized(new { message = "Mật khẩu không chính xác." });
                }

                // Seamlessly migrate legacy plain text to BCrypt hash
                if (PasswordHelper.IsLegacyPlainText(customer.PasswordHash))
                {
                    customer.PasswordHash = PasswordHelper.HashPassword(dto.Password);
                    customer.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                var token = Guid.NewGuid().ToString("N");
                return Ok(new
                {
                    accessToken = token,
                    role = "customer",
                    user = new
                    {
                        id = customer.Id,
                        name = customer.Name ?? "Khách hàng",
                        phone = customer.Phone,
                        email = customer.Email,
                        role = customer.Role,
                        tier = customer.Tier,
                        address = customer.Address,
                    },
                    customer = new
                    {
                        id = customer.Id,
                        name = customer.Name ?? "Khách hàng",
                        phone = customer.Phone,
                        email = customer.Email,
                        role = customer.Role,
                        tier = customer.Tier,
                        address = customer.Address,
                    }
                });
            }

            return Unauthorized(new { message = "Tài khoản hoặc mật khẩu không chính xác." });
        }
    }
}
