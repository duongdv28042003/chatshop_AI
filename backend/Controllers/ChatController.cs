using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public ChatController(AppDbContext context, IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        public class SendMessageDto
        {
            public string UserId { get; set; } = string.Empty;
            public string Role { get; set; } = "customer";
            public string Message { get; set; } = string.Empty;
            public string? ImageUrl { get; set; }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] string? userId, [FromQuery] string? role)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Ok(new List<object>());
            }

            var conversation = await GetOrCreateConversationAsync(userId, role ?? "customer");
            var messages = await _context.Messages
                .Where(m => m.ConversationId == conversation.Id)
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
                conversationId = conversation.Id,
                messages
            });
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Message))
            {
                return BadRequest(new { message = "Nội dung tin nhắn không được để trống." });
            }

            var conversation = await GetOrCreateConversationAsync(dto.UserId, dto.Role);

            var userMsg = new Message
            {
                ConversationId = conversation.Id,
                Role = dto.Role == "staff" || dto.Role == "admin" ? "staff" : "user",
                Content = dto.Message,
                ImageUrl = dto.ImageUrl,
                CreatedAt = DateTime.UtcNow
            };
            _context.Messages.Add(userMsg);
            await _context.SaveChangesAsync();

            string aiReply = string.Empty;
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30);

                var aiPayload = new
                {
                    user_id = dto.UserId,
                    message = dto.Message,
                    image_path = dto.ImageUrl
                };

                var content = new StringContent(JsonSerializer.Serialize(aiPayload), Encoding.UTF8, "application/json");
                var response = await client.PostAsync("http://localhost:8000/api/ai/chat", content);

                if (response.IsSuccessStatusCode)
                {
                    var resJson = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(resJson);
                    if (doc.RootElement.TryGetProperty("reply", out var replyElem))
                    {
                        aiReply = replyElem.GetString() ?? "";
                    }
                }
            }
            catch
            {

                aiReply = $"Dạ em đã nhận được yêu cầu '{dto.Message}' rồi ạ! Bé AI đang tra cứu kho hàng và sẵn sàng hỗ trợ mình ngay đây ạ 💕";
            }

            if (string.IsNullOrWhiteSpace(aiReply))
            {
                aiReply = "Dạ em chào mình ạ! Em có thể hỗ trợ anh/chị chọn size hoặc tra cứu các mẫu Áo thun A02, Quần Jean Q01 của shop ạ!";
            }

            var aiMsg = new Message
            {
                ConversationId = conversation.Id,
                Role = "assistant",
                Content = aiReply,
                CreatedAt = DateTime.UtcNow
            };
            _context.Messages.Add(aiMsg);

            conversation.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                conversationId = conversation.Id,
                userMessage = userMsg,
                aiMessage = aiMsg,
                reply = aiReply
            });
        }

        private async Task<Conversation> GetOrCreateConversationAsync(string userId, string role)
        {
            Conversation? conversation = null;

            if (Guid.TryParse(userId, out var guidId))
            {
                if (role == "customer")
                {
                    conversation = await _context.Conversations
                        .FirstOrDefaultAsync(c => c.CustomerId == guidId);
                }
                else
                {
                    conversation = await _context.Conversations
                        .FirstOrDefaultAsync(c => c.AssignedTo == guidId || c.ZaloUserId == userId);
                }
            }
            else
            {
                conversation = await _context.Conversations
                    .FirstOrDefaultAsync(c => c.ZaloUserId == userId);
            }

            if (conversation == null)
            {
                conversation = new Conversation
                {
                    CustomerId = Guid.TryParse(userId, out var cid) && role == "customer" ? cid : null,
                    ZaloUserId = userId,
                    Status = "ai_handling",
                    IsHumanMode = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();

                var welcomeMsg = new Message
                {
                    ConversationId = conversation.Id,
                    Role = "assistant",
                    Content = "Dạ em chào anh/chị ạ! Em là Trợ Lý AI của Fashion Shop ✨ Em có thể giúp gì cho mình về tư vấn chọn size, tìm mẫu áo quần hay kiểm tra đơn hàng ạ?",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Messages.Add(welcomeMsg);
                await _context.SaveChangesAsync();
            }

            return conversation;
        }
    }
}
