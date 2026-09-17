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

        [HttpPost("upload-image")]
        public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Không tìm thấy file ảnh tải lên." });
            }

            try
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var extension = Path.GetExtension(file.FileName);
                if (string.IsNullOrWhiteSpace(extension)) extension = ".jpg";
                var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var imageUrl = $"http://localhost:5000/uploads/{uniqueFileName}";
                return Ok(new { imageUrl, fileName = uniqueFileName });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi khi tải ảnh lên: {ex.Message}" });
            }
        }

        [HttpPost("send")]
        [HttpPost("message")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Message) && string.IsNullOrWhiteSpace(dto.ImageUrl))
            {
                return BadRequest(new { message = "Nội dung tin nhắn hoặc hình ảnh không được để trống." });
            }

            var textContent = string.IsNullOrWhiteSpace(dto.Message) ? "Tìm kiếm sản phẩm qua hình ảnh" : dto.Message.Trim();
            var conversation = await GetOrCreateConversationAsync(dto.UserId, dto.Role);

            var userMsg = new Message
            {
                ConversationId = conversation.Id,
                Role = dto.Role == "staff" || dto.Role == "admin" ? "staff" : "user",
                Content = textContent,
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
                    user_id = string.IsNullOrWhiteSpace(dto.UserId) ? "guest" : dto.UserId,
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
            string safeUserId = string.IsNullOrWhiteSpace(userId) ? "guest" : userId;

            if (Guid.TryParse(safeUserId, out var guidId))
            {
                if (role == "customer")
                {
                    conversation = await _context.Conversations
                        .FirstOrDefaultAsync(c => c.CustomerId == guidId || c.ZaloUserId == safeUserId);
                }
                else
                {
                    conversation = await _context.Conversations
                        .FirstOrDefaultAsync(c => c.AssignedTo == guidId || c.ZaloUserId == safeUserId);
                }
            }
            else
            {
                conversation = await _context.Conversations
                    .FirstOrDefaultAsync(c => c.ZaloUserId == safeUserId);
            }

            if (conversation == null)
            {
                Guid? validCustomerId = null;
                if (Guid.TryParse(safeUserId, out var cid) && role == "customer")
                {
                    var exists = await _context.Customers.AnyAsync(c => c.Id == cid);
                    if (exists)
                    {
                        validCustomerId = cid;
                    }
                }

                conversation = new Conversation
                {
                    CustomerId = validCustomerId,
                    ZaloUserId = safeUserId,
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
