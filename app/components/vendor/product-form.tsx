
'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Upload,
  X,
  Plus,
  Minus,
  DollarSign,
  Package,
  Info,
  Tag,
  Clock,
  AlertTriangle,
  ImageIcon,
  Loader2,
  Star,
  Utensils,
  Zap,
  Leaf,
  Wheat,
  Flame,
} from "lucide-react";
import Image from "next/image";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.number().min(0.01, "Price must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  categoryId: z.string().optional(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  ingredients: z.string().optional(),
  allergens: z.string().optional(),
  isSpicy: z.boolean().default(false),
  prepTime: z.number().optional(),
  sku: z.string().optional(),
  stockQuantity: z.number().optional(),
  lowStockAlert: z.number().optional(),
  isTrackingStock: z.boolean().default(false),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  nutritionInfo: z.any().optional(),
  dietaryInfo: z.array(z.string()).optional(),
  spiceLevel: z.number().min(1).max(5).optional(),
  isSignatureDish: z.boolean().default(false),
  displayOrder: z.number().optional(),
  originalPrice: z.number().optional(),
  discountPercent: z.number().optional(),
  promotionStart: z.string().optional(),
  promotionEnd: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  vendor: any;
  categories: any[];
  product?: any;
  onSuccess: () => void;
}

const defaultDietaryOptions = [
  { id: "vegetarian", label: "Vegetarian", icon: Leaf },
  { id: "vegan", label: "Vegan", icon: Leaf },
  { id: "gluten-free", label: "Gluten Free", icon: Wheat },
  { id: "dairy-free", label: "Dairy Free", icon: Utensils },
  { id: "nut-free", label: "Nut Free", icon: AlertTriangle },
  { id: "halal", label: "Halal", icon: Star },
  { id: "kosher", label: "Kosher", icon: Star },
  { id: "low-carb", label: "Low Carb", icon: Zap },
  { id: "keto", label: "Keto", icon: Zap },
  { id: "organic", label: "Organic", icon: Leaf },
];

export default function ProductForm({ vendor, categories, product, onSuccess }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>(product?.images || []);
  const [mainImage, setMainImage] = useState(product?.image || "");
  const [tagInput, setTagInput] = useState("");
  const [selectedDietaryInfo, setSelectedDietaryInfo] = useState<string[]>(product?.dietaryInfo || []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || 0,
      category: product?.category || "",
      categoryId: product?.categoryId || "",
      image: product?.image || "",
      images: product?.images || [],
      ingredients: product?.ingredients || "",
      allergens: product?.allergens || "",
      isSpicy: product?.isSpicy || false,
      prepTime: product?.prepTime || 0,
      sku: product?.sku || "",
      stockQuantity: product?.stockQuantity || 0,
      lowStockAlert: product?.lowStockAlert || 10,
      isTrackingStock: product?.isTrackingStock || false,
      weight: product?.weight || 0,
      dimensions: product?.dimensions || "",
      nutritionInfo: product?.nutritionInfo || {},
      dietaryInfo: product?.dietaryInfo || [],
      spiceLevel: product?.spiceLevel || 1,
      isSignatureDish: product?.isSignatureDish || false,
      displayOrder: product?.displayOrder || 0,
      originalPrice: product?.originalPrice || 0,
      discountPercent: product?.discountPercent || 0,
      promotionStart: product?.promotionStart ? new Date(product.promotionStart).toISOString().split('T')[0] : "",
      promotionEnd: product?.promotionEnd ? new Date(product.promotionEnd).toISOString().split('T')[0] : "",
      tags: product?.tags || [],
      metaTitle: product?.metaTitle || "",
      metaDescription: product?.metaDescription || "",
    },
  });

  const watchedFields = watch();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'africanmarket');
        formData.append('folder', 'products');

        const response = await fetch(
          'https://i.ytimg.com/vi/PvjwkJduAPE/maxresdefault.jpg',
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const newImages = [...uploadedImages, ...uploadedUrls];
      setUploadedImages(newImages);
      setValue('images', newImages);
      
      // Set first uploaded image as main image if none exists
      if (!mainImage && uploadedUrls.length > 0) {
        setMainImage(uploadedUrls[0]);
        setValue('image', uploadedUrls[0]);
      }
      
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload images');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (imageUrl: string) => {
    const newImages = uploadedImages.filter(img => img !== imageUrl);
    setUploadedImages(newImages);
    setValue('images', newImages);
    
    if (mainImage === imageUrl) {
      const newMainImage = newImages[0] || "";
      setMainImage(newMainImage);
      setValue('image', newMainImage);
    }
  };

  const setAsMainImage = (imageUrl: string) => {
    setMainImage(imageUrl);
    setValue('image', imageUrl);
  };

  const addTag = () => {
    if (tagInput.trim()) {
      const currentTags = watchedFields.tags || [];
      const newTags = [...currentTags, tagInput.trim()];
      setValue('tags', newTags);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = watchedFields.tags || [];
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    setValue('tags', newTags);
  };

  const toggleDietaryInfo = (option: string) => {
    const newDietaryInfo = selectedDietaryInfo.includes(option)
      ? selectedDietaryInfo.filter(item => item !== option)
      : [...selectedDietaryInfo, option];
    
    setSelectedDietaryInfo(newDietaryInfo);
    setValue('dietaryInfo', newDietaryInfo);
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    
    try {
      const url = product ? `/api/vendor/products/${product.id}` : '/api/vendor/products';
      const method = product ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          images: uploadedImages,
          image: mainImage,
          dietaryInfo: selectedDietaryInfo,
        }),
      });

      if (response.ok) {
        toast.success(product ? 'Product updated successfully' : 'Product created successfully');
        onSuccess();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save product');
      }
    } catch (error) {
      toast.error('An error occurred while saving the product');
      console.error('Save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter product name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="price">Price (CAD) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      {...register("price", { valueAsNumber: true })}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                  {errors.price && (
                    <p className="text-sm text-red-600 mt-1">{errors.price.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select onValueChange={(value) => setValue("category", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appetizers">Appetizers</SelectItem>
                      <SelectItem value="main-courses">Main Courses</SelectItem>
                      <SelectItem value="desserts">Desserts</SelectItem>
                      <SelectItem value="beverages">Beverages</SelectItem>
                      <SelectItem value="sides">Sides</SelectItem>
                      <SelectItem value="soups">Soups</SelectItem>
                      <SelectItem value="salads">Salads</SelectItem>
                      <SelectItem value="snacks">Snacks</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="prepTime">Prep Time (minutes)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="prepTime"
                      type="number"
                      {...register("prepTime", { valueAsNumber: true })}
                      placeholder="30"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Describe your product..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ingredients">Ingredients</Label>
                  <Textarea
                    id="ingredients"
                    {...register("ingredients")}
                    placeholder="List ingredients separated by commas"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="allergens">Allergens</Label>
                  <Textarea
                    id="allergens"
                    {...register("allergens")}
                    placeholder="List allergens separated by commas"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isSpicy"
                    checked={watchedFields.isSpicy}
                    onCheckedChange={(checked) => setValue("isSpicy", checked)}
                  />
                  <Label htmlFor="isSpicy" className="flex items-center space-x-1">
                    <Flame className="h-4 w-4" />
                    <span>Spicy</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isSignatureDish"
                    checked={watchedFields.isSignatureDish}
                    onCheckedChange={(checked) => setValue("isSignatureDish", checked)}
                  />
                  <Label htmlFor="isSignatureDish" className="flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>Signature Dish</span>
                  </Label>
                </div>
                <div>
                  <Label htmlFor="spiceLevel">Spice Level (1-5)</Label>
                  <Input
                    id="spiceLevel"
                    type="number"
                    min="1"
                    max="5"
                    {...register("spiceLevel", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5" />
                <span>Product Images</span>
              </CardTitle>
              <CardDescription>
                Upload multiple images for your product. The first image will be used as the main image.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Click to upload images or drag and drop
                  </span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB each
                  </span>
                </label>
                {isUploading && (
                  <div className="mt-4 flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Uploading...</span>
                  </div>
                )}
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {uploadedImages.map((imageUrl, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={`Product image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setAsMainImage(imageUrl)}
                            >
                              Main
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => removeImage(imageUrl)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {mainImage === imageUrl && (
                          <div className="absolute top-2 left-2">
                            <Badge variant="default">Main</Badge>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Utensils className="h-5 w-5" />
                <span>Product Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Dietary Information</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {defaultDietaryOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedDietaryInfo.includes(option.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => toggleDietaryInfo(option.id)}
                    >
                      <option.icon className="h-4 w-4" />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">Weight (grams)</Label>
                  <Input
                    id="weight"
                    type="number"
                    {...register("weight", { valueAsNumber: true })}
                    placeholder="250"
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions">Dimensions (L x W x H)</Label>
                  <Input
                    id="dimensions"
                    {...register("dimensions")}
                    placeholder="10 x 5 x 3 cm"
                  />
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {watchedFields.tags?.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  {...register("displayOrder", { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Inventory Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isTrackingStock"
                  checked={watchedFields.isTrackingStock}
                  onCheckedChange={(checked) => setValue("isTrackingStock", checked)}
                />
                <Label htmlFor="isTrackingStock">Track inventory for this product</Label>
              </div>

              {watchedFields.isTrackingStock && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="stockQuantity">Stock Quantity</Label>
                    <Input
                      id="stockQuantity"
                      type="number"
                      {...register("stockQuantity", { valueAsNumber: true })}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lowStockAlert">Low Stock Alert</Label>
                    <Input
                      id="lowStockAlert"
                      type="number"
                      {...register("lowStockAlert", { valueAsNumber: true })}
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      {...register("sku")}
                      placeholder="PROD-001"
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <Label className="text-base font-medium">Promotions</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="originalPrice">Original Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="originalPrice"
                        type="number"
                        step="0.01"
                        {...register("originalPrice", { valueAsNumber: true })}
                        placeholder="0.00"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="discountPercent">Discount %</Label>
                    <Input
                      id="discountPercent"
                      type="number"
                      min="0"
                      max="100"
                      {...register("discountPercent", { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="promotionStart">Promotion Start</Label>
                    <Input
                      id="promotionStart"
                      type="date"
                      {...register("promotionStart")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="promotionEnd">Promotion End</Label>
                    <Input
                      id="promotionEnd"
                      type="date"
                      {...register("promotionEnd")}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>SEO Settings</span>
              </CardTitle>
              <CardDescription>
                Optimize your product for search engines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  {...register("metaTitle")}
                  placeholder="SEO-friendly title"
                />
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  {...register("metaDescription")}
                  placeholder="Brief description for search engines"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {product ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              {product ? "Update Product" : "Create Product"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
