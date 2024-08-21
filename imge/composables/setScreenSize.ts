import { onMounted, onUnmounted } from "vue";
import { blackboardState } from "~/stores/website";

export function setScreenSize() {
    const websiteStore = blackboardState();

    const updateScreenSize = () => {
        const width = window.innerWidth;
        websiteStore.screenSize = width;

        // Optionally, you can also update screenSizeName based on the width
        if (width < 480) {
            websiteStore.screenSizeName = "mobile";
            websiteStore.screenSizeIndex = 0;
        } else if (width < 1024) {
            websiteStore.screenSizeName = "tablet";
            websiteStore.screenSizeIndex = 1;
        } else {
            websiteStore.screenSizeName = "pc";
            websiteStore.screenSizeIndex = 2;
        }
    };

    // Set up event listeners
    onMounted(() => {
        updateScreenSize(); // Initial call to set screen size
        window.addEventListener("resize", updateScreenSize);
    });

    // Clean up event listeners
    onUnmounted(() => {
        window.removeEventListener("resize", updateScreenSize);
    });
}
