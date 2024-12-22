<!-- 
    Kutay Coskuner, 2024
    Component Template 1.5 
-->
<!-- ----------------------------------------------------------------------
                scripts
----------------------------------------------------------------------- -->
<script>
import treeData from '@/data/tree_data.json';

export default {
    name: "ContentNavigator",
    data() {
        return {
            tree: [], // Tree structure created from the JSON
            isOpen: {}, // Tracks folder open/close state
        };
    },
    created() {
        this.buildTree();
    },
    methods: {
        /**
         * Builds a hierarchical tree structure from the data
         */
        buildTree() {
            this.tree = treeData.data.reduce((acc, item) => {
                let currentLevel = acc;

                // Process each category as a folder
                item.category.forEach((category) => {
                    // Check if folder already exists
                    let folder = currentLevel.find((f) => f.name === category);
                    if (!folder) {
                        folder = { name: category, children: [] };
                        currentLevel.push(folder);
                    }
                    currentLevel = folder.children; // Move deeper
                });

                // Add the actual item as a leaf node
                currentLevel.push({
                    name: item.name,
                    link: item.to,
                    details: item,
                    children: null, // Leaf nodes don't have children
                });

                return acc;
            }, []);
        },

        /**
         * Toggle folder open/close state
         * @param {Number} index - Folder index in the tree
         */
        toggleFolder(index) {
            this.$set(this.isOpen, index, !this.isOpen[index]);
        },
    },
};
</script>

<!-- ----------------------------------------------------------------------
                template
----------------------------------------------------------------------- -->
<template>
    <ul class="folder-tree">
        <li v-for="(folder, index) in tree" :key="index">
            <!-- Folder item -->
            <div v-if="folder.children" @click="toggleFolder(index)" class="folder-item">
                <span>{{ isOpen[index] ? "📂" : "📁" }}</span>
                <span>{{ folder.name }}</span>
            </div>
            <!-- Leaf item -->
            <div v-else class="folder-item">
                <span>📄</span>
                <span>{{ folder.name }}</span>
            </div>

            <!-- Render subfolders recursively -->
            <ul v-if="isOpen[index] && folder.children">
                <ContentNavigator :treeData="folder.children" />
            </ul>
        </li>
    </ul>
</template>

<!-- ----------------------------------------------------------------------
                style
----------------------------------------------------------------------- -->
<style scoped>
.folder-tree {
    list-style: none;
    margin: 0;
    padding: 0 0 0 20px; /* Indent child folders */
}

.folder-item {
    cursor: pointer;
    margin-bottom: 5px;
    display: flex;
    align-items: center;
}

.folder-item span {
    margin-right: 8px;
}
</style>
