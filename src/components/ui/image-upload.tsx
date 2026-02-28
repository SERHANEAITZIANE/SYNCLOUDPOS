"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ImagePlus, Trash } from "lucide-react"
import Image from "next/image"
import imageCompression from "browser-image-compression";


interface ImageUploadProps {
    disabled?: boolean
    onChange: (value: string) => void
    onRemove: (value: string) => void
    value: string[]
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    disabled,
    onChange,
    onRemove,
    value
}) => {
    const [isMounted, setIsMounted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        try {
            setIsLoading(true);

            // Compress and resize to max 300x300 for performance
            const options = {
                maxSizeMB: 0.2, // 200KB max
                maxWidthOrHeight: 300, // 300px max width/height
                useWebWorker: true,
            };

            const compressedFile = await imageCompression(file, options);

            const formData = new FormData();
            formData.append("file", compressedFile, compressedFile.name);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            const data = await response.json();
            onChange(data.url);
        } catch (error) {
            console.error("Upload error:", error);
            // toast.error("Image upload failed");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isMounted) {
        return null
    }

    return (
        <div>
            <div className="mb-4 flex items-center gap-4">
                {value.map((url) => (
                    <div key={url} className="relative w-[200px] h-[200px] rounded-md overflow-hidden">
                        <div className="z-10 absolute top-2 right-2">
                            <Button type="button" onClick={() => onRemove(url)} variant="destructive" size="icon">
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                        <Image
                            fill
                            className="object-cover"
                            alt="Image"
                            src={url}
                        />
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-4">
                <Button
                    type="button"
                    variant="secondary"
                    disabled={disabled || isLoading}
                    onClick={() => document.getElementById("file-upload")?.click()}
                >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    {isLoading ? "Uploading..." : "Upload Image"}
                </Button>
                <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onUpload}
                    disabled={disabled || isLoading}
                />
            </div>
        </div>
    )
}
