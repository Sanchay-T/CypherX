import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string;
  src?: string;
  initials?: string;
  className?: string;
};

export function UserAvatar({ name, src, initials, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      <AvatarImage src={src} alt={name} />
      <AvatarFallback>
        {initials ??
          name
            ?.split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() ?? "CX"}
      </AvatarFallback>
    </Avatar>
  );
}
