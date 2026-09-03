using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ConversationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ConversationsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetConversations([FromQuery] string? search, [FromQuery] string? status)
        {
            var query = _context.Conversations
                .Include(c => c.Customer)
                .Include(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                query = query.Where(c => c.Status == status);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(c => c.ZaloUserId.ToLower().Contains(s) || (c.Customer != null && (
                    (c.Customer.Name != null && c.Customer.Name.ToLower().Contains(s)) ||
                    (c.Customer.Phone != null && c.Customer.Phone.Contains(s))
                )));
            }

            var conversations = await query.OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt).ToListAsync();
            return Ok(conversations);
        }

        [HttpPatch("{id}/claim")]
        public async Task<IActionResult> Claim(Guid id)
        {
            var conversation = await _context.Conversations.FindAsync(id);
            if (conversation == null) return NotFound();

            conversation.Status = "human_handling";
            conversation.IsHumanMode = true;
            conversation.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(conversation);
        }

        [HttpPatch("{id}/close")]
        public async Task<IActionResult> Close(Guid id)
        {
            var conversation = await _context.Conversations.FindAsync(id);
            if (conversation == null) return NotFound();

            conversation.Status = "closed";
            conversation.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(conversation);
        }
    }
}
