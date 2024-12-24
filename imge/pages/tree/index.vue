<script setup>

// state
import { imgeState } from '~/stores/imge';
const bank = imgeState();

// imports
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
// color mode
const colorMode = useColorMode()
const bank_colorMode = computed(() => bank.get_colorMode);
// State for selected content
const selectedContent = ref({
    name: '',
    author: '',
    created: '',
    updated: '',
    translator: '',
    editor: '',
    abstract: '',
    keywords: [],
    language: '',
    visibility: false,
    image: '',
    imagecredit: '',
});

// Update function to set selected content
function updateSelectedContent(content) {
    if (content != undefined)
        selectedContent.value = content;
    else {
        selectedContent.value = {
            name: '',
            author: '',
            created: '',
            updated: '',
            translator: '',
            editor: '',
            abstract: '',
            keywords: [],
            language: '',
            visibility: false,
            image: '',
            imagecredit: '',

        };
    }
}

watch(bank_colorMode, (newMode) => {
    colorMode.value = newMode;
}

);

</script>

<template>
    <div class="main">

        <div class="main-navigation">
            <LeftHoverNavigation />
        </div>


        <div class="content-navigator">
            <ContentNavigator @select-content="updateSelectedContent" />
        </div>

        <div class="preview" v-if="selectedContent.name != ''">

            <!-- Dynamically added image inside the preview -->
            <img v-if="selectedContent.image != ''" :src="selectedContent.image" alt="Background Image"
                class="preview-image" />

            <div class="content-title">{{ selectedContent.name }}</div>

            <div class="content-abstract"> {{ selectedContent.abstract }} </div>

            <div class="content-author" v-if="selectedContent.author">

                <div v-if="selectedContent.language" class="content-language">
                    {{ getLanguageDescription(selectedContent.language) }}
                    <br>
                </div>

                <div class="content-editor" v-if="selectedContent.editor">
                    edited by
                    {{ selectedContent.editor }}
                    <br>
                </div>
                <div class="content-translator" v-if="selectedContent.translator">
                    translated by
                    {{ selectedContent.translator }}
                    <br>
                </div>


                {{ selectedContent.author }},
                {{ formatDate(selectedContent.created, "yyyy") }}
            </div>

        </div>

    </div>
</template>

<style scoped>
@import "@/assets/stylesheets/blacksail_font.css";
@import "@/assets/stylesheets/wallpaper.css";

.main {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 0px;
}

.main-navigation {
    grid-column: -1 / 1;
}

.content-navigator {
    margin: 0 auto;
    grid-column: 4 / 7;
    display: grid;
    place-items: center;
    height: 80vh;
}

.preview {
    position: relative;
    padding: .2em;
    grid-column: 8 / 12;
    margin-top: 40%;
    height: 40vh;
    border-radius: 2px;
}

.preview img {
    object-fit:contain;
    height: 100%;
    width: 100%;
    z-index: -1;
    opacity: .6;
}

.preview .content-title {
    font-family: monospace;
    font-weight: bold;
    font-size: 2em;
}

.preview .content-abstract {
    font-style: italic;
    font-family: monospace;
    margin-top: 2em;
}


.preview .content-language,
.preview .content-editor,
.content-translator {
    font-style: italic;
    opacity: .6;
}


.preview .content-author {
    text-align: right;
    margin-top: 4em;
    font-family: monospace;
    bottom: 0;
    right: 0;
}
</style>
