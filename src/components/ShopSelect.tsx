"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import { IoIosArrowDown } from "react-icons/io";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import shops from "@/data/shops.json";

type ShopOption = {
  title: string;
  icon: string;
};

const PLACEHOLDER: ShopOption = { title: "Select Shop", icon: "" };

// The active shop is derived from the URL (/shops/<title>), not tracked as
// its own source of truth — so browser back/forward and direct links land
// on the right dropdown state without an effect re-navigating on mount.
function shopFromPathname(pathname: string): ShopOption {
  const slug = pathname.split("/")[2];
  return shops.find((s) => s.title === slug) || PLACEHOLDER;
}

const ShopSelect = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedShop, setSelectedShop] = useState<ShopOption>(() =>
    shopFromPathname(pathname)
  );

  useEffect(() => {
    setSelectedShop(shopFromPathname(pathname));
  }, [pathname]);

  const handleSelectShop = useCallback((shop?: string) => {
    if (shop) {
      router.push(`/shops/${shop}`);
    }
  }, [router]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="min-w-[70px] max-w-fit bg-accent pl-2 pr-3 rounded-lg border">
        <div className="flex items-center capitalize min-h-10">
          {selectedShop.icon && (
            <Image
              src={selectedShop.icon}
              width={40}
              height={40}
              alt={selectedShop.title}
            />
          )}

          <span>{selectedShop.title}</span>
          <span className="inline-block pl-1">
            <IoIosArrowDown />
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[60vh] overflow-auto narrowScrollbar"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground px-4">
            Shops
          </DropdownMenuLabel>
          {shops.map((shop, index) => (
            <DropdownMenuItem
              key={index}
              className="px-4 [&>.indicator]:hidden capitalize"
              onClick={() => handleSelectShop(shop.title)}
            >
              <div className="flex items-center">
                <Image
                  src={shop.icon}
                  width={40}
                  height={40}
                  alt={shop.title}
                />

                <span>{shop.title}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShopSelect;
