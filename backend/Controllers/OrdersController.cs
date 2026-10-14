using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrdersController(AppDbContext context)
        {
            _context = context;
        }

        public class CreateOrderItemDto
        {
            public Guid? VariantId { get; set; }
            public int Quantity { get; set; } = 1;
            public int UnitPrice { get; set; }
        }

        public class CreateOrderDto
        {
            public Guid? CustomerId { get; set; }
            public string? Note { get; set; }
            public List<CreateOrderItemDto> Items { get; set; } = new();
        }

        [HttpGet]
        public async Task<IActionResult> GetOrders(
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] Guid? customerId)
        {
            var query = _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Variant)
                        .ThenInclude(v => v!.Product)
                            .ThenInclude(p => p!.Images)
                .AsNoTracking();

            if (customerId.HasValue)
            {
                query = query.Where(o => o.CustomerId == customerId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                query = query.Where(o => o.Status == status);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(o => 
                    (o.Customer != null && (
                        (o.Customer.Name != null && o.Customer.Name.ToLower().Contains(s)) ||
                        (o.Customer.Phone != null && o.Customer.Phone.Contains(s))
                    )) ||
                    (o.Note != null && o.Note.ToLower().Contains(s))
                );
            }

            var orders = await query.OrderByDescending(o => o.CreatedAt).ToListAsync();
            return Ok(orders);
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            if (dto.Items == null || !dto.Items.Any())
            {
                return BadRequest(new { message = "Đơn hàng phải có ít nhất 1 sản phẩm." });
            }

            int total = dto.Items.Sum(i => i.UnitPrice * i.Quantity);

            // Kiểm tra CustomerId có thực sự tồn tại trong database để tránh lỗi Foreign Key (500)
            Guid? validCustomerId = null;
            if (dto.CustomerId.HasValue)
            {
                var exists = await _context.Customers.AnyAsync(c => c.Id == dto.CustomerId.Value);
                if (exists)
                {
                    validCustomerId = dto.CustomerId.Value;
                }
            }

            // Tự động liên kết khách hàng theo số điện thoại từ Note nếu chưa có CustomerId
            if (!validCustomerId.HasValue && !string.IsNullOrWhiteSpace(dto.Note))
            {
                var phoneMatch = System.Text.RegularExpressions.Regex.Match(dto.Note, @"SĐT:\s*([0-9]{9,11})");
                if (phoneMatch.Success)
                {
                    var phone = phoneMatch.Groups[1].Value.Trim();
                    var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == phone);
                    if (customer != null)
                    {
                        validCustomerId = customer.Id;
                    }
                }
            }

            var order = new Order
            {
                CustomerId = validCustomerId,
                TotalAmount = total,
                Status = "pending",
                Note = dto.Note,
                CreatedAt = DateTime.UtcNow
            };

            foreach (var item in dto.Items)
            {
                Guid? validVariantId = null;
                if (item.VariantId.HasValue)
                {
                    var vExists = await _context.ProductVariants.AnyAsync(v => v.Id == item.VariantId.Value);
                    if (vExists)
                    {
                        validVariantId = item.VariantId.Value;
                    }
                }

                order.Items.Add(new OrderItem
                {
                    VariantId = validVariantId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    CreatedAt = DateTime.UtcNow
                });
            }

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            return Ok(order);
        }

        public class UpdateStatusDto
        {
            public string Status { get; set; } = string.Empty;
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusDto dto)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            order.Status = dto.Status;
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(order);
        }
    }
}
