using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class Category
    {
        public Guid Id { get; set; }
        public string Slug { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        public List<Product> Products { get; set; } = new();
    }

    public class Product
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Guid? CategoryId { get; set; }
        public Category? Category { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public List<ProductVariant> Variants { get; set; } = new();
        public List<ProductImage> Images { get; set; } = new();
    }

    public class ProductVariant
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public Product? Product { get; set; }
        public string Sku { get; set; } = string.Empty;
        public string? Color { get; set; }
        public string? Size { get; set; }
        public int Price { get; set; }
        public int Stock { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public class ProductImage
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public Product? Product { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
        public string? Embedding { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Customer
    {
        public Guid Id { get; set; }
        public string? ZaloUserId { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? PasswordHash { get; set; }
        public string? Name { get; set; }
        public string? Address { get; set; }
        public string? Note { get; set; }
        public string Role { get; set; } = "customer";
        public string Tier { get; set; } = "standard";
        public string[] Skus { get; set; } = Array.Empty<string>();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public List<Conversation> Conversations { get; set; } = new();
        public List<Order> Orders { get; set; } = new();
    }

    public class Staff
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string Role { get; set; } = "staff";
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public class Conversation
    {
        public Guid Id { get; set; }
        public Guid? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public string ZaloUserId { get; set; } = string.Empty;
        public string Status { get; set; } = "ai_handling";
        public bool IsHumanMode { get; set; } = false;
        public Guid? AssignedTo { get; set; }
        [ForeignKey("AssignedTo")]
        public Staff? AssignedStaff { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public List<Message> Messages { get; set; } = new();
    }

    public class Message
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public Conversation? Conversation { get; set; }
        public string Role { get; set; } = "user";
        public string Content { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Order
    {
        public Guid Id { get; set; }
        public Guid? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public Guid? ConversationId { get; set; }
        public Conversation? Conversation { get; set; }
        public string Status { get; set; } = "pending";
        public string? Note { get; set; }
        public int TotalAmount { get; set; }
        public Guid? AssignedTo { get; set; }
        [ForeignKey("AssignedTo")]
        public Staff? AssignedStaff { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public List<OrderItem> Items { get; set; } = new();
    }

    public class OrderItem
    {
        public Guid Id { get; set; }
        public Guid OrderId { get; set; }
        public Order? Order { get; set; }
        public Guid? VariantId { get; set; }
        public ProductVariant? Variant { get; set; }
        public int Quantity { get; set; }
        public int UnitPrice { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
