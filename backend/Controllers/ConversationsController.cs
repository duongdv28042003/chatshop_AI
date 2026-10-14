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

        public class StaffReplyDto
        {
            public string Content { get; set; } = string.Empty;
            public string? ImageUrl { get; set; }
            public Guid? StaffId { get; set; }
        }

        public class ToggleModeDto
        {
            public bool? IsHumanMode { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> GetConversations([FromQuery] string? search, [FromQuery] string? status)
        {
            var query = _context.Conversations
                .Include(c => c.Customer)
                .Include(c => c.AssignedStaff)
                .Include(c => c.Messages)
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

            var list = await query.OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt).ToListAsync();

            var result = list.Select(c =>
            {
                var lastMsg = c.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
                var customerName = c.Customer?.Name;
                if (string.IsNullOrWhiteSpace(customerName))
                {
                    if (!string.IsNullOrWhiteSpace(c.Customer?.Phone))
                    {
                        customerName = $"Khách {c.Customer.Phone}";
                    }
                    else
                    {
                        customerName = $"Khách Zalo #{c.Id.ToString()[..6].ToUpper()}";
                    }
                }

                return new
                {
                    id = c.Id,
                    customerId = c.CustomerId,
                    customer = c.Customer != null ? new
                    {
                        id = (Guid?)c.Customer.Id,
                        name = customerName,
                        phone = c.Customer.Phone,
                        email = c.Customer.Email,
                        address = c.Customer.Address,
                        tier = c.Customer.Tier
                    } : new
                    {
                        id = (Guid?)null,
                        name = customerName,
                        phone = (string?)null,
                        email = (string?)null,
                        address = (string?)null,
                        tier = "standard"
                    },
                    zaloUserId = c.ZaloUserId,
                    status = c.Status,
                    isHumanMode = c.IsHumanMode,
                    assignedTo = c.AssignedTo,
                    assignedStaff = c.AssignedStaff != null ? new
                    {
                        id = c.AssignedStaff.Id,
                        fullName = c.AssignedStaff.FullName,
                        email = c.AssignedStaff.Email,
                        role = c.AssignedStaff.Role
                    } : null,
                    createdAt = c.CreatedAt,
                    updatedAt = c.UpdatedAt,
                    lastMessage = lastMsg != null ? new
                    {
                        id = lastMsg.Id,
                        conversationId = lastMsg.ConversationId,
                        role = lastMsg.Role,
                        content = lastMsg.Content,
                        imageUrl = lastMsg.ImageUrl,
                        createdAt = lastMsg.CreatedAt
                    } : null,
                    messageCount = c.Messages.Count
                };
            });

            return Ok(result);
        }

        [HttpGet("{id}/messages")]
        public async Task<IActionResult> GetMessages(Guid id)
        {
            var conversation = await _context.Conversations
                .Include(c => c.Customer)
                .Include(c => c.AssignedStaff)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (conversation == null) return NotFound(new { message = "Không tìm thấy hội thoại." });

            var messages = await _context.Messages
                .Where(m => m.ConversationId == id)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new
                {
                    id = m.Id,
                    conversationId = m.ConversationId,
                    role = m.Role,
                    content = m.Content,
                    imageUrl = m.ImageUrl,
                    createdAt = m.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                conversation = new
                {
                    id = conversation.Id,
                    customerId = conversation.CustomerId,
                    customer = conversation.Customer != null ? new
                    {
                        id = conversation.Customer.Id,
                        name = conversation.Customer.Name ?? $"Khách {conversation.Customer.Phone ?? "Zalo"}",
                        phone = conversation.Customer.Phone,
                        email = conversation.Customer.Email,
                        address = conversation.Customer.Address,
                        tier = conversation.Customer.Tier
                    } : null,
                    zaloUserId = conversation.ZaloUserId,
                    status = conversation.Status,
                    isHumanMode = conversation.IsHumanMode,
                    assignedTo = conversation.AssignedTo,
                    assignedStaff = conversation.AssignedStaff != null ? new
                    {
                        id = conversation.AssignedStaff.Id,
                        fullName = conversation.AssignedStaff.FullName,
                        email = conversation.AssignedStaff.Email
                    } : null,
                    createdAt = conversation.CreatedAt,
                    updatedAt = conversation.UpdatedAt
                },
                messages
            });
        }

        [HttpPost("{id}/reply")]
        public async Task<IActionResult> Reply(Guid id, [FromBody] StaffReplyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Content) && string.IsNullOrWhiteSpace(dto.ImageUrl))
            {
                return BadRequest(new { message = "Nội dung tin nhắn không được để trống." });
            }

            var conversation = await _context.Conversations.FindAsync(id);
            if (conversation == null) return NotFound(new { message = "Không tìm thấy hội thoại." });

            var msg = new Message
            {
                ConversationId = id,
                Role = "staff",
                Content = dto.Content?.Trim() ?? "",
                ImageUrl = dto.ImageUrl,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(msg);

            // Khi nhân viên trả lời, tự động chuyển sang human_handling
            conversation.Status = "human_handling";
            conversation.IsHumanMode = true;
            if (dto.StaffId.HasValue)
            {
                conversation.AssignedTo = dto.StaffId.Value;
            }
            conversation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = msg,
                conversationStatus = conversation.Status,
                isHumanMode = conversation.IsHumanMode
            });
        }

        [HttpPatch("{id}/toggle-mode")]
        public async Task<IActionResult> ToggleMode(Guid id, [FromBody] ToggleModeDto? dto)
        {
            var conversation = await _context.Conversations.FindAsync(id);
            if (conversation == null) return NotFound(new { message = "Không tìm thấy hội thoại." });

            bool nextHumanMode = dto?.IsHumanMode ?? !conversation.IsHumanMode;
            conversation.IsHumanMode = nextHumanMode;
            conversation.Status = nextHumanMode ? "human_handling" : "ai_handling";
            conversation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = conversation.Id,
                status = conversation.Status,
                isHumanMode = conversation.IsHumanMode
            });
        }

        [HttpPatch("{id}/claim")]
        public async Task<IActionResult> Claim(Guid id, [FromQuery] Guid? staffId)
        {
            var conversation = await _context.Conversations.FindAsync(id);
            if (conversation == null) return NotFound();

            conversation.Status = "human_handling";
            conversation.IsHumanMode = true;
            if (staffId.HasValue)
            {
                conversation.AssignedTo = staffId.Value;
            }
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

        [HttpPatch("{id}/reopen")]
        public async Task<IActionResult> Reopen(Guid id)
        {
            var conversation = await _context.Conversations.FindAsync(id);
            if (conversation == null) return NotFound();

            conversation.Status = conversation.IsHumanMode ? "human_handling" : "ai_handling";
            conversation.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(conversation);
        }

        public class UpdateMessageDto
        {
            public string Content { get; set; } = string.Empty;
        }

        [HttpPut("messages/{id}")]
        public async Task<IActionResult> UpdateMessage(Guid id, [FromBody] UpdateMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Content))
            {
                return BadRequest(new { message = "Nội dung tin nhắn không được để trống." });
            }

            var message = await _context.Messages.FindAsync(id);
            if (message == null) return NotFound(new { message = "Không tìm thấy tin nhắn." });

            message.Content = dto.Content.Trim();
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = message.Id,
                conversationId = message.ConversationId,
                role = message.Role,
                content = message.Content,
                imageUrl = message.ImageUrl,
                createdAt = message.CreatedAt
            });
        }

        [HttpDelete("messages/{id}")]
        public async Task<IActionResult> DeleteMessage(Guid id, [FromQuery] bool recall = false)
        {
            var message = await _context.Messages.FindAsync(id);
            if (message == null) return NotFound(new { message = "Không tìm thấy tin nhắn." });

            if (recall)
            {
                // Thu hồi (2 phía)
                message.Content = "[Tin nhắn đã được thu hồi]";
                message.ImageUrl = null;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Đã thu hồi tin nhắn", recalled = true, id });
            }
            else
            {
                // Xóa hoàn toàn (2 phía)
                _context.Messages.Remove(message);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Đã xóa tin nhắn", deleted = true, id });
            }
        }
    }
}
