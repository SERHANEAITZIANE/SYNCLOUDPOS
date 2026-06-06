import { useState, useEffect } from "react";

export function useMobile() {
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const userAgent = window.navigator.userAgent;
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        
        const checkMobile = () => {
            setIsMobile(isMobileUA || window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        
        return () => {
            window.removeEventListener("resize", checkMobile);
        };
    }, []);

    return isMobile;
}
