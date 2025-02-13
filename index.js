import { createFileTree } from ".";
import { faker } from "@faker-js/faker";
import eruda from "eruda";
eruda.init();

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomFileItem() {
    const isFile = Math.random() >= 0.5;
    return {
        name: isFile
            ? faker.system.commonFileName()
            : faker.string.alpha({ length: { min: 4, max: 12 } }),
        isDirectory: !isFile,
    };
}

function fakeDirectoryContent() {
    const itemsCount = randomIntFromInterval(1, 10);
    return new Array(itemsCount).fill(null).map(randomFileItem);
}

function copy(text) {
    var input = document.createElement("input");
    input.setAttribute("value", text);
    document.body.appendChild(input);
    input.select();
    var result = document.execCommand("copy");
    document.body.removeChild(input);
    return result;
}

const cache = {};
const iconCache = {};
const colorCache = new Set();

const directoryIconOpen = document.createElement("div");
directoryIconOpen.innerText = "🔽";
const directoryIconClose = document.createElement("div");
directoryIconClose.innerText = "▶️";

const fileTree = createFileTree({
    readDirectory: (path) => {
        let content = cache[path];
        if (!content) {
            content = fakeDirectoryContent();
            cache[path] = content;
        }
        return content;
    },
    isDirectory: (path) => randomFileItem().isDirectory,
    directoryIcons: {
        open: directoryIconOpen,
        close: directoryIconClose,
    },
    prefix: (path) => {
        let imgSrc = iconCache[path];
        if (!imgSrc) {
            imgSrc = faker.image.avatar();
            iconCache[path] = imgSrc;
        }
        const img = document.createElement("img");
        img.src = imgSrc;
        return img;
    },
    suffix: (path) => {
        const div = document.createElement("div");
        div.innerText = "···";
        return div;
    },
    name: (name) => {
        // const input = document.createElement("input");
        // input.value = name;
        // return input;
    },
    classes: (path) => {
        if(colorCache.has(path)) return ["red"]
        return []
    },
    onSelect: (path) => copy(path),
});

document.body.append(fileTree.container);

const input = document.createElement("input");
const add = document.createElement("button");
add.innerText = "Add";
add.onclick = () => {
    const v = input.value;
    fileTree.addItem(v);
    input.value = "";
};
const remove = document.createElement("button");
remove.innerText = "Remove";
remove.onclick = () => {
    const v = input.value;
    fileTree.removeItem(v);
    input.value = "";
};
const update = document.createElement("button");
update.innerText = "Update";
update.onclick = () => {
    const v = input.value;
    if(colorCache.has(v)) {
        colorCache.delete(v)
    } else {
        colorCache.add(v)
    }
    fileTree.refreshItem(v)
    input.value = "";
};

document.body.append(input, add, remove, update);
