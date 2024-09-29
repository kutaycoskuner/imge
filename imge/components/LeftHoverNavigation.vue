<!-- Component Template 1.1 -->

<!-- -------------------------------------------------------------------------------------
--------- scripts
-------------------------------------------------------------------------------------- -->
<script setup>
import { imgeState } from '~/stores/imge';
const bank = imgeState();

import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';

// color mode
const colorMode = useColorMode()
const bank_colorMode = computed(() => bank.get_colorMode);

const prevScrollPos = ref(0);
const toggleNavigation = ref(false);
const invertedColor = ref(true);

function toggleLeft() {

}

function openLeft() {
    toggleNavigation.value = true;
}

function closeLeft() {
    toggleNavigation.value = false;
}

function scrollToTop() {
    window.scrollTo(0, 0);
}

watch(bank_colorMode, (newMode) => {
        colorMode.value = newMode;
        newMode == 'dark' ? invertedColor.value = true : invertedColor.value = false;
    }
);

</script>

<!-- -------------------------------------------------------------------------------------
--------- templates
-------------------------------------------------------------------------------------- -->
<template>
    <div ref="nav" :class="{ 'navigation-container0': true, 'open': toggleNavigation }"
        class="hover-control touch-control">
        <div :class="{ 'touch-menu-icon': true, 'closed': toggleNavigation, 'inverted-color': invertedColor }"
            class="fixed-nav-icon hover-trans-invisible" @click="openLeft()"><img
                src="@/public/icons/menu-grid_256.png" />
        </div>
        <nav :class="{ 'navigation': true, 'open': toggleNavigation }" class="hover-trans-visible touch-leftslide">
            <div @click.stop="closeLeft()"><nuxt-link to="/"> architecture </nuxt-link></div>
            <div @click.stop="closeLeft()"><nuxt-link to="/"> visualization </nuxt-link></div>
            <div @click.stop="closeLeft()" :class="{ 'touch-only': true, 'open': toggleNavigation }"><img
                    :class="{ 'inverted-color': invertedColor }" src="@/public/icons/arrow_left_256.png"
                    alt="arrow" />
            </div>
            <!-- <nuxt-link to="/other">                  other           </nuxt-link> -->
            <div class="navigation-icons hover-trans-visible">
                <!-- <a :class="{ 'inverted-color': invertedColorComputed }"><img src="~/static/icons/discord.png" alt="dsc"></a> -->
                <!-- <nuxt-link to="/about" :class="{ 'inverted-color': invertedColorComputed }"><img
                        src="~/static/icons/line_paper_plane.png" alt="dsc"></nuxt-link> -->
                <!-- <colormode /> -->
            </div>
        </nav>

    </div>
</template>

<!-- -------------------------------------------------------------------------------------
--------- styles
-------------------------------------------------------------------------------------- -->
<style scoped>
.navigation-container0 {
    font-family: var(--ui-font);
    font-weight: bold;
    text-decoration: bold;
    text-transform: uppercase;
    font-size: 0.8em;
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    /* margin: 1em; */
    max-width: 1920px;
    width: 100%;
    height: 0;
    display: grid;
    grid-template-rows: repeat(1, 1fr);
    grid-template-columns: auto 1fr;
    white-space: nowrap;
    z-index: 20;
}

.fixed-nav-icon {
    position: fixed;
    top: var(--navigation-margin-top);
    left: var(--navigation-margin-left);
}

.fixed-nav-icon img {
    opacity: 0.8;
    height: 1.4em;
}

.navigation {
    letter-spacing: 2px;
    margin-top: var(--navigation-margin-top);
    margin-right: auto;
    margin-bottom: auto;
    margin-left: var(--navigation-margin-left);
    display: grid;
    grid-template-rows: repeat(1, 1fr);
    align-self: flex-start;
}

.navigation a {
    text-decoration: none;
    display: inline-block;
    position: relative;
    transition: color 0.2s ease;
    margin-bottom: 0.3em;
    opacity: 0.7;
    color: var(--col);
    z-index: 90;
}

.navigation a:hover {
    opacity: 0.2;
    /* background: linear-gradient(
        to right,
        var(--color-link),
        var(--color-link-active)
    );
    -webkit-background-clip: text;
    -moz-background-clip: text;
    -webkit-text-fill-color: transparent; 
    -moz-text-fill-color: transparent; */
    color: var(--col-secondary);
}

.sub-navigation {
    margin: 1em 1em 0 1.5em;
    display: grid;
    grid-template-rows: repeat(auto-fit, minmax(min-content, 1fr));
    opacity: 0.7;
    box-sizing: border-box;
}

.sub-navigation a {
    overflow: hidden;
    /* or white-space: nowrap; */
    box-sizing: border-box;
}

.navigation-icons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-column-gap: calc(2 * var(--font-size));
    position: relative;
    bottom: calc(-.2 * var(--font-size));
}

.navigation-icons * {
    width: 120%;
    height: 100%;
    margin: 0;
    padding: 0;
}

.navigation-icons a:hover {
    border-bottom: 0px solid var(--bg);
}

.navigation-icons *:hover {
    filter: drop-shadow(0 0 .4em var(--icon-glow));
}

.navigation-icons img {
    object-fit: contain;

    width: calc(2 * var(--font-size));
    height: calc(2 * var(--font-size));
    filter: grayscale(1);
    /* filter: invert(1); */
}

.noselect {
    -webkit-touch-callout: none;
    /* iOS Safari */
    -webkit-user-select: none;
    /* Safari */
    -khtml-user-select: none;
    /* Konqueror HTML */
    -moz-user-select: none;
    /* Old versions of Firefox */
    -ms-user-select: none;
    /* Internet Explorer/Edge */
    user-select: none;
}

@media (min-width: 481px) and (mix-width: 1025px) {}

@media (min-width: 481px) and (max-width: 1024px) {
    .touch-menu-icon {
        position: fixed;
        left: 1em;
        top: 1em;
        padding: 2px;
        /* background: #fff; */
        border-radius: 2px;
        opacity: 1;
        transition: opacity .2s;
    }

    .touch-menu-icon.closed {
        opacity: 0;
    }

    .navigation-container0 {
        height: 100%;
        width: 0;
        position: fixed;
        top: 0;
        left: 0;
        background: var(--bg);
        background-image: url("../static/images/general/noisy-background2.jpg");
        background-size: var(--bg-size) var(--bg-size);
        background-repeat: repeat;
        box-shadow: 1px 1px 2px 2px rgba(0, 0, 0, 0.1);
        transition: width 0.2s, left 0.2s;
    }

    .navigation-container0.open {
        width: 40%;
        left: 20%;
    }

    .navigation {
        letter-spacing: 1px;
        margin-left: 1em;
        margin-top: 1em;
        font-size: 0.8em;
        margin-right: auto;
        margin-bottom: auto;
        display: grid;
        grid-template-rows: repeat(1, 1fr);
        align-self: flex-start;
        visibility: hidden;
        transition: opacity .2s;
    }

    .navigation.open {
        visibility: visible;
    }

    .touch-only {
        opacity: 0;
    }

    .touch-only.open {
        margin-top: 1em;
        max-width: 100%;
        max-height: 1em;
        opacity: 1;
    }

    .touch-only img {
        max-width: 100%;
        max-height: 1em;
        opacity: 0.7;
    }


}

@media (max-width: 480px) {
    .touch-menu-icon {
        position: fixed;
        left: 1em;
        top: 1em;
        padding: 2px;
        /* background: #fff; */
        border-radius: 2px;
        opacity: 1;
        transition: opacity .2s;
    }

    .touch-menu-icon.closed {
        opacity: 0;
    }

    .navigation-container0 {
        height: 100%;
        width: 0;
        position: fixed;
        top: 0;
        left: 0;
        background: var(--bg);
        background-image: var(--bg-img);
        background-size: var(--bg-size) var(--bg-size);
        background-repeat: repeat;
        box-shadow: 1px 1px 2px 2px rgba(0, 0, 0, 0.1);
        transition: width 0.2s, left 0.2s;
    }

    .navigation-container0.open {
        width: 60%;
        left: 30%;
    }

    .navigation {
        letter-spacing: 1px;
        margin-left: 1em;
        margin-top: 1em;
        font-size: 0.8em;
        margin-right: auto;
        margin-bottom: auto;
        display: grid;
        grid-template-rows: repeat(1, 1fr);
        align-self: flex-start;
        visibility: hidden;
        transition: opacity .2s;
    }

    .navigation.open {
        visibility: visible;
    }

    .touch-only {
        opacity: 0;
    }

    .touch-only.open {
        margin-top: 1em;
        max-width: 100%;
        max-height: 1em;
        opacity: 1;
    }

    .touch-only img {
        max-width: 100%;
        max-height: 1em;
        opacity: 0.7;
    }


}
</style>