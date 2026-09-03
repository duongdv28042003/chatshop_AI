using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var totalOrders = await _context.Orders.CountAsync();
            var pendingOrders = await _context.Orders.CountAsync(o => o.Status == "pending");
            var totalRevenue = await _context.Orders
                .Where(o => o.Status != "cancelled")
                .SumAsync(o => (long)o.TotalAmount);
            var activeConversations = await _context.Conversations.CountAsync(c => c.Status != "closed");
            var lowStockCount = await _context.ProductVariants.CountAsync(pv => pv.Stock <= 5);
            var totalCustomers = await _context.Customers.CountAsync();

            return Ok(new
            {
                totalRevenue,
                revenueChange = 12.5,
                totalOrders,
                ordersChange = 8.0,
                pendingOrders,
                activeConversations,
                lowStockCount,
                totalCustomers
            });
        }

        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenue()
        {
            var now = DateTime.UtcNow;
            var list = new List<object>();

            for (int i = 13; i >= 0; i--)
            {
                var day = now.AddDays(-i);
                var dateStr = day.ToString("dd/MM");
                list.Add(new
                {
                    date = dateStr,
                    revenue = (1000000 + (i * 150000)),
                    orders = (3 + (i % 5))
                });
            }

            return Ok(list);
        }
    }
}
