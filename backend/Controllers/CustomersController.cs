using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CustomersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetCustomers([FromQuery] string? search, [FromQuery] string? tier)
        {
            var query = _context.Customers.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(tier) && tier != "all")
            {
                query = query.Where(c => c.Tier == tier);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(c =>
                    (c.Name != null && c.Name.ToLower().Contains(s)) ||
                    (c.Phone != null && c.Phone.Contains(s)) ||
                    (c.Email != null && c.Email.ToLower().Contains(s))
                );
            }

            var customers = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
            return Ok(customers);
        }

        public class RegisterCustomerDto
        {
            public string? Name { get; set; }
            public string Phone { get; set; } = string.Empty;
            public string? Email { get; set; }
            public string Password { get; set; } = string.Empty;
            public string? Address { get; set; }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterCustomerDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Số điện thoại và mật khẩu là bắt buộc." });
            }

            var existing = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == dto.Phone);
            if (existing != null)
            {
                if (!string.IsNullOrEmpty(existing.PasswordHash))
                {
                    return BadRequest(new { message = "Số điện thoại này đã được đăng ký tài khoản." });
                }

                existing.Name = dto.Name ?? existing.Name;
                existing.Email = dto.Email ?? existing.Email;
                existing.Address = dto.Address ?? existing.Address;
                existing.PasswordHash = dto.Password;
                existing.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(new { message = "Kích hoạt tài khoản thành công!", customer = existing });
            }

            var customer = new Customer
            {
                Name = dto.Name,
                Phone = dto.Phone,
                Email = dto.Email,
                PasswordHash = dto.Password,
                Address = dto.Address,
                Role = "customer",
                Tier = "standard"
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký thành công!", customer });
        }

        public class CustomerLoginDto
        {
            public string PhoneOrEmail { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] CustomerLoginDto dto)
        {
            var identifier = dto.PhoneOrEmail.Trim().ToLower();
            var customer = await _context.Customers.FirstOrDefaultAsync(c =>
                (c.Phone == identifier || (c.Email != null && c.Email.ToLower() == identifier))
            );

            if (customer == null || customer.PasswordHash != dto.Password)
            {
                return Unauthorized(new { message = "Số điện thoại/Email hoặc mật khẩu không chính xác." });
            }

            var token = Guid.NewGuid().ToString("N");

            return Ok(new
            {
                accessToken = token,
                customer = new
                {
                    id = customer.Id,
                    name = customer.Name,
                    phone = customer.Phone,
                    email = customer.Email,
                    address = customer.Address,
                    role = customer.Role,
                    tier = customer.Tier,
                    createdAt = customer.CreatedAt
                }
            });
        }

        public class UpdateTierDto
        {
            public string Tier { get; set; } = "standard";
        }

        [HttpPatch("{id}/tier")]
        public async Task<IActionResult> UpdateTier(Guid id, [FromBody] UpdateTierDto dto)
        {
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null) return NotFound();

            customer.Tier = dto.Tier;
            customer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(customer);
        }
    }
}
