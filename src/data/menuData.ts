import type { Category, MenuItem } from "../types";

/**
 * This file is the single source of truth for the menu in Phase 1–3.
 * In Phase 4 it gets replaced by Supabase queries (categories / menu_items
 * tables) behind the same shape, so components never need to change —
 * only src/services/menuService.ts will.
 */

export const CATEGORIES: Category[] = [
  { id: "burgers", name: "Burgers", icon: "🍔" },
  { id: "sandwich", name: "Sandwich", icon: "🥪" },
  { id: "fries", name: "Fries", icon: "🍟" },
  { id: "maggi", name: "Maggi", icon: "🍜" },
  { id: "pasta", name: "Pasta", icon: "🍝" },
  { id: "snacks", name: "Snacks", icon: "🧀" },
  { id: "waffle", name: "Waffle", icon: "🧇" },
  { id: "dessert", name: "Dessert", icon: "🍰" },
  { id: "combos", name: "Combos", icon: "🎁" },
  { id: "espresso", name: "Espresso", icon: "☕" },
  { id: "cold", name: "Cold Beverages", icon: "🥤" },
  { id: "shakes", name: "Milkshake", icon: "🥛" },
  { id: "tea", name: "Tea", icon: "🍵" },
  { id: "mocktails", name: "Mocktails", icon: "🍹" },
];

export const MENU_ITEMS: MenuItem[] = [
  // Burgers
  { id: "b1", categoryId: "burgers", name: "Aloo Tikki Burger", description: "Crisp potato tikki patty with fresh veggies", price: 79, isVeg: true, isAvailable: true },
  { id: "b2", categoryId: "burgers", name: "Veggie Delight Burger", description: "Loaded vegetable patty, lettuce & sauces", price: 109, isVeg: true, isAvailable: true },
  { id: "b3", categoryId: "burgers", name: "Cheese Burger", description: "Classic veg patty burger with a melted cheese slice", price: 119, isVeg: true, isAvailable: true },
  { id: "b4", categoryId: "burgers", name: "Mexican Burger", description: "Spiced Mexican-style veg patty with jalapeños", price: 119, isVeg: true, isAvailable: true },

  // Sandwich
  { id: "s1", categoryId: "sandwich", name: "Veg Grilled Sandwich", description: "Grilled bread packed with mixed vegetables", price: 89, isVeg: true, isAvailable: true },
  { id: "s2", categoryId: "sandwich", name: "Masala Sandwich", description: "Spiced potato masala filling, grilled", price: 109, isVeg: true, isAvailable: true },
  { id: "s3", categoryId: "sandwich", name: "Cheese Chutney Sandwich", description: "Mint chutney and melted cheese", price: 109, isVeg: true, isAvailable: true },
  { id: "s4", categoryId: "sandwich", name: "Corn Cheese Sandwich", description: "Sweet corn and cheese, grilled golden", price: 109, isVeg: true, isAvailable: true },
  { id: "s5", categoryId: "sandwich", name: "Vegetable Sandwich", description: "Fresh mixed vegetables and butter", price: 119, isVeg: true, isAvailable: true },

  // Fries
  { id: "f1", categoryId: "fries", name: "French Fries", description: "Classic salted crispy fries", price: 89, isVeg: true, isAvailable: true },
  { id: "f2", categoryId: "fries", name: "Peri Peri French Fries", description: "Tossed in tangy peri peri seasoning", price: 89, isVeg: true, isAvailable: true },
  { id: "f3", categoryId: "fries", name: "Tandoori Fries", description: "Smoky tandoori-spiced fries", price: 109, isVeg: true, isAvailable: true },
  { id: "f4", categoryId: "fries", name: "Cheese Fries", description: "Loaded with melted cheese", price: 109, isVeg: true, isAvailable: true },

  // Maggi
  { id: "m1", categoryId: "maggi", name: "Classic Maggi", description: "The everyday favourite, simply made", price: 79, isVeg: true, isAvailable: true },
  { id: "m2", categoryId: "maggi", name: "Double Masala Maggi", description: "Extra masala for extra flavour", price: 89, isVeg: true, isAvailable: true },
  { id: "m3", categoryId: "maggi", name: "Vegetable Maggi", description: "Loaded with fresh chopped vegetables", price: 109, isVeg: true, isAvailable: true },
  { id: "m4", categoryId: "maggi", name: "Cheese Maggi", description: "Finished with a generous layer of cheese", price: 119, isVeg: true, isAvailable: true },
  { id: "m5", categoryId: "maggi", name: "Pizza Style Maggi", description: "Maggi topped pizza-style with cheese & herbs", price: 119, isVeg: true, isAvailable: true },
  { id: "m6", categoryId: "maggi", name: "Paneer Cheese Maggi", description: "Paneer cubes with melted cheese", price: 119, isVeg: true, isAvailable: true },

  // Pasta
  { id: "p1", categoryId: "pasta", name: "Alfredo Pasta (White)", description: "Creamy white sauce pasta", price: 179, isVeg: true, isAvailable: true },
  { id: "p2", categoryId: "pasta", name: "Arrabbiata Pasta (Red)", description: "Spicy tomato red sauce pasta", price: 179, isVeg: true, isAvailable: true },
  { id: "p3", categoryId: "pasta", name: "Mix Sauce Pasta", description: "A blend of red and white sauces", price: 179, isVeg: true, isAvailable: true },

  // Snacks
  { id: "sn1", categoryId: "snacks", name: "Cheese Crispy Veg Finger", description: "Crunchy veg fingers with a cheesy centre", price: 89, isVeg: true, isAvailable: true },
  { id: "sn2", categoryId: "snacks", name: "Veg Pizza Pocket", description: "Pizza-filled crispy pocket", price: 89, isVeg: true, isAvailable: true },
  { id: "sn3", categoryId: "snacks", name: "Veg Potato Shot", description: "Bite-sized crispy potato snack", price: 89, isVeg: true, isAvailable: true },
  { id: "sn4", categoryId: "snacks", name: "Butter Cheesy Corn", description: "Buttered sweet corn with cheese", price: 119, isVeg: true, isAvailable: true },

  // Waffle
  { id: "w1", categoryId: "waffle", name: "Vanilla Waffle", description: "Warm Belgian waffle with vanilla", price: 199, isVeg: true, isAvailable: true },
  { id: "w2", categoryId: "waffle", name: "Chocolate Waffle", description: "Warm Belgian waffle with chocolate sauce", price: 199, isVeg: true, isAvailable: true },

  // Dessert
  { id: "d1", categoryId: "dessert", name: "Brownie Burst", description: "Rich fudgy chocolate brownie", price: 89, isVeg: true, isAvailable: true },
  { id: "d2", categoryId: "dessert", name: "Brownie Burst with Ice Cream", description: "Warm brownie topped with ice cream", price: 119, isVeg: true, isAvailable: true },

  // Combos
  { id: "c1", categoryId: "combos", name: "Classic Combo", description: "Classic Maggi + Hot Coffee", price: 199, isVeg: true, isAvailable: true },
  { id: "c2", categoryId: "combos", name: "Sandwich Combo", description: "Veg Grilled Sandwich + Mocktail", price: 199, isVeg: true, isAvailable: true },
  { id: "c3", categoryId: "combos", name: "Pasta Combo", description: "Pasta + Cold Coffee", price: 229, isVeg: true, isAvailable: true },
  { id: "c4", categoryId: "combos", name: "Suto Special Combo", description: "Aloo Tikki Burger 1+1, Cold Coffee & French Fries", price: 239, isVeg: true, isAvailable: true },

  // Espresso
  { id: "e1", categoryId: "espresso", name: "Hot Coffee", description: "Freshly brewed filter-style hot coffee", price: 49, isVeg: true, isAvailable: true },
  { id: "e2", categoryId: "espresso", name: "Espresso", description: "A classic single shot", price: 69, isVeg: true, isAvailable: true },
  { id: "e3", categoryId: "espresso", name: "Americano", description: "Espresso lengthened with hot water", price: 89, isVeg: true, isAvailable: true },
  { id: "e4", categoryId: "espresso", name: "Iced Americano", description: "Chilled espresso over ice", price: 109, isVeg: true, isAvailable: true },
  { id: "e5", categoryId: "espresso", name: "Cappuccino", description: "Espresso with steamed, frothed milk", price: 109, isVeg: true, isAvailable: true },
  { id: "e6", categoryId: "espresso", name: "Mocha", description: "Espresso with chocolate and steamed milk", price: 119, isVeg: true, isAvailable: true },

  // Cold beverages
  { id: "cb1", categoryId: "cold", name: "Cold Coffee", description: "Classic chilled cold coffee", price: 69, isVeg: true, isAvailable: true },
  { id: "cb2", categoryId: "cold", name: "Strong Cold Coffee", description: "Extra-strength cold coffee", price: 79, isVeg: true, isAvailable: true },
  { id: "cb3", categoryId: "cold", name: "Thick Cold Coffee", description: "Extra thick and creamy", price: 89, isVeg: true, isAvailable: true },
  { id: "cb4", categoryId: "cold", name: "Chocolate Cold Coffee", description: "Cold coffee with chocolate", price: 109, isVeg: true, isAvailable: true },
  { id: "cb5", categoryId: "cold", name: "Oreo Cold Coffee", description: "Blended with Oreo cookies", price: 109, isVeg: true, isAvailable: true },
  { id: "cb6", categoryId: "cold", name: "Hot Chocolate", description: "Rich and warm chocolate drink", price: 109, isVeg: true, isAvailable: true },

  // Milkshakes
  { id: "sh1", categoryId: "shakes", name: "Chocolate Shake", description: "Thick chocolate milkshake", price: 149, isVeg: true, isAvailable: true },
  { id: "sh2", categoryId: "shakes", name: "Oreo Shake", description: "Blended with Oreo cookies", price: 149, isVeg: true, isAvailable: true },
  { id: "sh3", categoryId: "shakes", name: "KitKat Shake", description: "Blended with KitKat", price: 149, isVeg: true, isAvailable: true },
  { id: "sh4", categoryId: "shakes", name: "Brownie Shake", description: "Loaded with brownie chunks", price: 149, isVeg: true, isAvailable: true },
  { id: "sh5", categoryId: "shakes", name: "Hazelnut Shake", description: "Rich hazelnut flavour", price: 149, isVeg: true, isAvailable: true },
  { id: "sh6", categoryId: "shakes", name: "Strawberry Shake", description: "Fresh strawberry milkshake", price: 149, isVeg: true, isAvailable: true },
  { id: "sh7", categoryId: "shakes", name: "Mango Shake", description: "Fresh mango milkshake", price: 149, isVeg: true, isAvailable: true },

  // Tea
  { id: "t1", categoryId: "tea", name: "Tea", description: "Classic Indian chai", price: 15, isVeg: true, isAvailable: true },
  { id: "t2", categoryId: "tea", name: "Black Tea", description: "No milk, just brewed tea", price: 15, isVeg: true, isAvailable: true },
  { id: "t3", categoryId: "tea", name: "Lemon Tea", description: "Brewed tea with a hint of lemon", price: 20, isVeg: true, isAvailable: true },
  { id: "t4", categoryId: "tea", name: "Ginger Tea", description: "Chai brewed with fresh ginger", price: 20, isVeg: true, isAvailable: true },
  { id: "t5", categoryId: "tea", name: "Masala Tea", description: "Chai with classic Indian spices", price: 20, isVeg: true, isAvailable: true },
  { id: "t6", categoryId: "tea", name: "Elaichi Tea", description: "Chai brewed with cardamom", price: 20, isVeg: true, isAvailable: true },
  { id: "t7", categoryId: "tea", name: "Bread Butter", description: "Toasted bread with butter", price: 20, isVeg: true, isAvailable: true },
  { id: "t8", categoryId: "tea", name: "Bun Maska", description: "Soft bun with a generous butter spread", price: 25, isVeg: true, isAvailable: true },

  // Mocktails
  { id: "mk1", categoryId: "mocktails", name: "Masala Lemonade", description: "Spiced fresh lemonade", price: 119, isVeg: true, isAvailable: true },
  { id: "mk2", categoryId: "mocktails", name: "Mint Mojito", description: "Refreshing mint and lime", price: 119, isVeg: true, isAvailable: true },
  { id: "mk3", categoryId: "mocktails", name: "Kala Khatta", description: "Tangy black-currant mocktail", price: 119, isVeg: true, isAvailable: true },
  { id: "mk4", categoryId: "mocktails", name: "Blue Blast", description: "Fruity blue curaçao-style mocktail", price: 119, isVeg: true, isAvailable: true },
  { id: "mk5", categoryId: "mocktails", name: "Peach Mojito", description: "Peach and mint, chilled", price: 119, isVeg: true, isAvailable: true },
];
