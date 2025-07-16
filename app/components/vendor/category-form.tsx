
'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Upload,
  X,
  Loader2,
  Tag,
  ImageIcon,
  Folder,
  Info,
} from "lucide-react";
import Image from "next/image";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
  parentId: z.string().optional(),
  displayOrder: z.number().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  vendor: any;
  category?: any;
  onSuccess: () => void;
}

export default function CategoryForm({ vendor, category, onSuccess }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(category?.image || "");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      description: category?.description || "",
      image: category?.image || "",
      isActive: category?.isActive ?? true,
      parentId: category?.parentId || "",
      displayOrder: category?.displayOrder || 0,
      metaTitle: category?.metaTitle || "",
      metaDescription: category?.metaDescription || "",
    },
  });

  const watchedFields = watch();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'africanmarket');
      formData.append('folder', 'categories');

      const response = await fetch(
        'https://res.cloudinary.com/demo/image/upload/f_auto/q_auto/v1682006902/docs/DAM/upload_preset_ui.png',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadedImage(data.secure_url);
      setValue('image', data.secure_url);
      
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setUploadedImage("");
    setValue('image', "");
  };

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    
    try {
      const url = category ? `/api/vendor/categories/${category.id}` : '/api/vendor/categories';
      const method = category ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          image: uploadedImage,
        }),
      });

      if (response.ok) {
        toast.success(category ? 'Category updated successfully' : 'Category created successfully');
        onSuccess();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save category');
      }
    } catch (error) {
      toast.error('An error occurred while saving the category');
      console.error('Save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5" />
            <span>Category Information</span>
          </CardTitle>
          <CardDescription>
            Create and organize your product categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter category name"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
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
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe this category..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={watchedFields.isActive}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Category Image</span>
          </CardTitle>
          <CardDescription>
            Upload an image to represent this category
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadedImage ? (
            <div className="relative group">
              <div className="aspect-video w-full max-w-md relative bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={uploadedImage}
                  alt="Category image"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={removeImage}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="category-image-upload"
              />
              <label
                htmlFor="category-image-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Click to upload image or drag and drop
                </span>
                <span className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB
                </span>
              </label>
              {isUploading && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>SEO Settings</span>
          </CardTitle>
          <CardDescription>
            Optimize your category for search engines
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

      <div className="flex justify-end space-x-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {category ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              {category ? "Update Category" : "Create Category"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
