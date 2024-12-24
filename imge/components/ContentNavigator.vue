<script>
import treeData from '@/data/tree_data.json';

export default {
    name: "ContentNavigator",
    data() {
        return {
            rawTree: treeData.data,
            tree: [], // Tree structure created from the JSON
            allCollapsed: false, // Track the global collapsed state of the tree
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
                    let folder = currentLevel.find((f) => f.name === category);
                    if (!folder) {
                        folder = { name: category, children: [] };
                        currentLevel.push(folder);
                    }
                    currentLevel = folder.children;
                });

                // Add the actual item as a leaf node
                currentLevel.push({
                    name: item.name,
                    link: item.to,
                    details: item,
                    children: null, // Leaf nodes don't have children
                    visible: item.visibility,
                });

                return acc;
            }, []);
        },

        /**
         * Renders the tree structure in a console-like style
         * @param {Array} tree - Tree to render
         * @param {String} prefix - Current prefix for the tree level
         * @param {Boolean} isLast - Whether the current item is the last in its level
         * @returns {String} - The formatted tree structure
         */
        renderTree(tree, prefix = '', isLast = false) {
            let result = '';

            tree.forEach((node, index) => {
                const isNodeLast = index === tree.length - 1;
                const newPrefix = prefix + (isLast ? '|    ' : '│    '); // Use 4 spaces for indentation

                // Render folder or leaf node
                result += `${prefix}${isNodeLast ? '└─── ' : '├─── '}${node.name}\n`;

                // Recursively render children
                if (node.children) {
                    result += this.renderTree(node.children, newPrefix, isNodeLast);
                }
            });

            return result;
        },

        /**
         * Renders the root node and the tree
         * @returns {String} - The formatted tree structure with root
         */
        renderWithRoot() {
            const rootName = '\n:root';
            let result = `${rootName}\n`; // No prefix or leading spaces for :root
            result += this.renderTree(this.tree, '', false); // Start rendering tree without indentation
            return result;
        },

        /**
         * Toggles the collapsed state of a node
         * @param {Object} node - Node to toggle
         */
        toggleCollapse(node) {
            node.collapsed = !node.collapsed;
            this.updateCollapseState();
        },

        /**
         * Expands all nodes
         */
        expandAll() {
            this.setCollapseStateForAllNodes(false);
            this.updateCollapseState();
        },

        /**
         * Collapses all nodes
         */
        collapseAll() {
            this.setCollapseStateForAllNodes(true);
            this.updateCollapseState();
        },

        /**
         * Toggles the collapse/expand state for all nodes
         */
        toggleExpandCollapse() {
            if (this.allCollapsed) {
                this.expandAll();
            } else {
                this.collapseAll();
            }
        },

        /**
         * Recursively sets the collapsed state for all nodes
         * @param {Boolean} state - The desired state (collapsed or expanded)
         */
        setCollapseStateForAllNodes(state) {
            const setState = (nodes) => {
                nodes.forEach((node) => {
                    node.collapsed = state;
                    if (node.children && node.children.length > 0) {
                        setState(node.children); // Recursively set state for children
                    }
                });
            };
            setState(this.tree); // Start with the root of the tree
        },

        /**
         * Checks the current state of the tree and updates the allCollapsed flag
         */
        updateCollapseState() {
            // Check if all nodes are collapsed
            const allCollapsed = this.checkAllCollapsed(this.tree);
            this.allCollapsed = allCollapsed;
        },

        /**
       * Checks if all nodes in the tree are collapsed
       * @param {Array} nodes - The nodes to check
       * @returns {Boolean} - True if all nodes are collapsed, false otherwise
       */
        checkAllCollapsed(nodes) {
            return nodes.every((node) => {
                if (node.children && !node.collapsed) {
                    return this.checkAllCollapsed(node.children); // Recursively check children
                }
                return node.collapsed; // Check if the leaf node is collapsed
            });
        },

        assignExpanseReverseClass() {
            return this.allCollapsed ? "reverse" : "";
        },

        selectNode(node_name) {
            // console.log(this.rawTree.find(item => item.name === node_name));
            this.$emit('select-content', this.rawTree.find(item => item.name === node_name));
        },
    },
};
</script>

<template>
    <!-- 
    <pre class="console-tree">
        {{ renderWithRoot() }}
    </pre> 
    -->

    <div class="tree-container">
        <div v-for="(node, index) in tree" :key="index">
            <div v-if="node.children && node.children.length > 0">
                <div class="folder">
                    <span @click="toggleCollapse(node)" class="toggle-btn">
                        {{ node.collapsed ? '+' : '-' }}
                    </span>
                    <span class="folder-name">{{ node.name }}</span>
                </div>
                <div v-show="!node.collapsed" class="children">
                    <!-- Render child nodes -->
                    <div v-for="(child, idx) in node.children" :key="idx">
                        <div v-if="child.children && child.children.length > 0">
                            <div class="folder">
                                <span @click="toggleCollapse(child)" class="toggle-btn">
                                    {{ child.collapsed ? '+' : '-' }}
                                </span>
                                <span class="folder-name">{{ child.name }}</span>
                            </div>
                            <div v-show="!child.collapsed" class="children">
                                <div v-for="(subChild, subIdx) in child.children" :key="subIdx">
                                    <a :href="subChild.link" 
                                    @mouseover.prevent="selectNode(subChild.name)"  
                                    @mouseleave.prevent="selectNode(undefined)"
                                    class="leaf-link">{{ subChild.name }}</a>
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            <a :href="child.link" class="leaf-link">{{ child.name }}</a>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else>
                <div class="leaf">
                    <a :href="node.link" class="leaf-link">{{ node.name }}</a>
                </div>
            </div>
        </div>

        <!-- Toggle button for expand/collapse all -->
        <div class="toggle-container">
            <div @click="toggleExpandCollapse" class="toggle-all-btn"
                :class="['expand-collapse', assignExpanseReverseClass()]">
                <img src="public/icons/arrow_left_256.png" alt="arrow" />
            </div>
            <!-- <span @click="toggleExpandCollapse" class="toggle-all-btn">
                {{ allCollapsed ? '↓' : '↑' }}
            </span> -->
        </div>
    </div>

</template>

<style scoped>
/* 
.console-tree {
    margin: 0;
    padding: 0;
    font-family: monospace;
    white-space: pre;
} 
*/

.expand-collapse {
    user-select: none;
    cursor: pointer;
}

.expand-collapse img {
    transform: rotate(90deg);
    max-width: 100%;
    max-height: .6em;
}

.expand-collapse.reverse img {
    transform: rotate(-90deg);
}

.tree-container {
    font-family: monospace;
    padding: 0;
    margin: 0;
}

.folder {
    display: flex;
    align-items: center;
}

.toggle-btn {
    cursor: pointer;
    margin-right: 8px;
}

.folder-name {
    font-weight: bold;
}

.children {
    padding-left: 20px;
}

.leaf {
    margin-left: 20px;
}

.leaf-link {
    text-decoration: none;
}

.leaf-link:hover {
    text-decoration: underline;
}
</style>
