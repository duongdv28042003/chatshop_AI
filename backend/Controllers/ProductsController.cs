using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public ProductsController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        public class ProductVariantInputDto
        {
            public Guid? Id { get; set; }
            public string Sku { get; set; } = string.Empty;
            public string? Color { get; set; }
            public string? Size { get; set; }
            public int Price { get; set; }
            public int Stock { get; set; }
            public bool IsActive { get; set; } = true;
        }

        public class ProductImageInputDto
        {
            public Guid? Id { get; set; }
            public string ImageUrl { get; set; } = string.Empty;
            public bool IsPrimary { get; set; }
        }

        public class ProductSaveDto
        {
            public string Code { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public Guid? CategoryId { get; set; }
            public string? Description { get; set; }
            public bool IsActive { get; set; } = true;
            public List<ProductVariantInputDto> Variants { get; set; } = new();
            public List<ProductImageInputDto> Images { get; set; } = new();
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _context.Categories
                .OrderBy(c => c.Name)
                .Select(c => new { c.Id, c.Slug, c.Name })
                .ToListAsync();
            return Ok(categories);
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
                var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var imageUrl = $"http://localhost:5000/uploads/{uniqueFileName}";
                return Ok(new { imageUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi khi tải ảnh lên: {ex.Message}" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetProducts([FromQuery] string? search)
        {
            var query = _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .Include(p => p.Images)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(s) || p.Code.ToLower().Contains(s));
            }

            var products = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
            return Ok(products);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetProduct(Guid id)
        {
            var product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) return NotFound();
            return Ok(product);
        }

        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] ProductSaveDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Code) || string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { message = "Mã sản phẩm và Tên sản phẩm không được để trống." });
            }

            var existingCode = await _context.Products.AnyAsync(p => p.Code.ToLower() == dto.Code.Trim().ToLower());
            if (existingCode)
            {
                return BadRequest(new { message = $"Mã sản phẩm '{dto.Code}' đã tồn tại." });
            }

            var product = new Product
            {
                Code = dto.Code.Trim().ToUpper(),
                Name = dto.Name.Trim(),
                CategoryId = dto.CategoryId,
                Description = dto.Description,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            if (dto.Variants != null && dto.Variants.Any())
            {
                foreach (var v in dto.Variants)
                {
                    product.Variants.Add(new ProductVariant
                    {
                        Sku = string.IsNullOrWhiteSpace(v.Sku) ? $"{product.Code}-{v.Color ?? "GEN"}-{v.Size ?? "OS"}" : v.Sku.Trim(),
                        Color = v.Color?.Trim(),
                        Size = v.Size?.Trim()?.ToUpper(),
                        Price = v.Price,
                        Stock = v.Stock,
                        IsActive = v.IsActive,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            else
            {
                product.Variants.Add(new ProductVariant
                {
                    Sku = $"{product.Code}-DEFAULT",
                    Color = "Tiêu chuẩn",
                    Size = "FreeSize",
                    Price = 150000,
                    Stock = 10,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (dto.Images != null && dto.Images.Any())
            {
                bool hasPrimary = false;
                foreach (var img in dto.Images)
                {
                    if (string.IsNullOrWhiteSpace(img.ImageUrl)) continue;
                    bool isPrim = img.IsPrimary || !hasPrimary;
                    product.Images.Add(new ProductImage
                    {
                        ImageUrl = img.ImageUrl.Trim(),
                        IsPrimary = isPrim,
                        CreatedAt = DateTime.UtcNow
                    });
                    if (isPrim) hasPrimary = true;
                }
            }

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] ProductSaveDto dto)
        {
            var product = await _context.Products
                .Include(p => p.Variants)
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) return NotFound(new { message = "Không tìm thấy sản phẩm." });

            var existingCode = await _context.Products.AnyAsync(p => p.Id != id && p.Code.ToLower() == dto.Code.Trim().ToLower());
            if (existingCode)
            {
                return BadRequest(new { message = $"Mã sản phẩm '{dto.Code}' đã được sử dụng bởi sản phẩm khác." });
            }

            product.Code = dto.Code.Trim().ToUpper();
            product.Name = dto.Name.Trim();
            product.CategoryId = dto.CategoryId;
            product.Description = dto.Description;
            product.IsActive = dto.IsActive;
            product.UpdatedAt = DateTime.UtcNow;

            if (dto.Variants != null)
            {
                var incomingIds = dto.Variants.Where(v => v.Id.HasValue).Select(v => v.Id!.Value).ToList();
                var variantsToRemove = product.Variants.Where(v => !incomingIds.Contains(v.Id)).ToList();
                _context.ProductVariants.RemoveRange(variantsToRemove);

                foreach (var v in dto.Variants)
                {
                    if (v.Id.HasValue)
                    {
                        var existingVariant = product.Variants.FirstOrDefault(ev => ev.Id == v.Id.Value);
                        if (existingVariant != null)
                        {
                            existingVariant.Sku = string.IsNullOrWhiteSpace(v.Sku) ? $"{product.Code}-{v.Color ?? "GEN"}-{v.Size ?? "OS"}" : v.Sku.Trim();
                            existingVariant.Color = v.Color?.Trim();
                            existingVariant.Size = v.Size?.Trim()?.ToUpper();
                            existingVariant.Price = v.Price;
                            existingVariant.Stock = v.Stock;
                            existingVariant.IsActive = v.IsActive;
                            existingVariant.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    else
                    {
                        product.Variants.Add(new ProductVariant
                        {
                            Sku = string.IsNullOrWhiteSpace(v.Sku) ? $"{product.Code}-{v.Color ?? "GEN"}-{v.Size ?? "OS"}" : v.Sku.Trim(),
                            Color = v.Color?.Trim(),
                            Size = v.Size?.Trim()?.ToUpper(),
                            Price = v.Price,
                            Stock = v.Stock,
                            IsActive = v.IsActive,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            if (dto.Images != null)
            {
                var incomingImgIds = dto.Images.Where(img => img.Id.HasValue).Select(img => img.Id!.Value).ToList();
                var imagesToRemove = product.Images.Where(img => !incomingImgIds.Contains(img.Id)).ToList();
                _context.ProductImages.RemoveRange(imagesToRemove);

                bool hasPrimary = false;
                foreach (var img in dto.Images)
                {
                    if (string.IsNullOrWhiteSpace(img.ImageUrl)) continue;
                    bool isPrim = img.IsPrimary || !hasPrimary;

                    if (img.Id.HasValue)
                    {
                        var existingImg = product.Images.FirstOrDefault(ei => ei.Id == img.Id.Value);
                        if (existingImg != null)
                        {
                            existingImg.ImageUrl = img.ImageUrl.Trim();
                            existingImg.IsPrimary = isPrim;
                        }
                    }
                    else
                    {
                        product.Images.Add(new ProductImage
                        {
                            ImageUrl = img.ImageUrl.Trim(),
                            IsPrimary = isPrim,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                    if (isPrim) hasPrimary = true;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(product);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            var product = await _context.Products
                .Include(p => p.Variants)
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) return NotFound(new { message = "Không tìm thấy sản phẩm." });

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã xóa sản phẩm thành công." });
        }
    }
}
