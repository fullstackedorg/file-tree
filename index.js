import { createFileTree } from ".";
import { faker } from "@faker-js/faker";
import eruda from "eruda";
eruda.init();

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomFileItem(_, i) {
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

const directoryIconOpen = document.createElement("div");
directoryIconOpen.innerText = "🔽";
const directoryIconClose = document.createElement("div");
directoryIconClose.innerText = "▶️";

const fileTree = createFileTree({
    readDirectory: async (path) => {
        let content = cache[path];
        if (!content) {
            content = fakeDirectoryContent();
            cache[path] = content;
        }
        return content;
    },
    directoryIcons: {
        open: directoryIconOpen,
        close: directoryIconClose,
    },
    iconPrefix: (fileItem) => {
        let imgSrc = iconCache[fileItem.path];
        if (!imgSrc) {
            imgSrc = faker.image.avatar();
            iconCache[fileItem.path] = imgSrc;
        }
        const img = document.createElement("img");
        img.src = imgSrc;
        return img;
    },
    actionSuffix: (fileItem) => {
        const div = document.createElement("div");
        div.innerText = "···";
        div.onclick = (e) => {
            e.stopPropagation();
            console.log(fileItem);
        };
        return div;
    },
    onSelect: ({ path }) => copy(path.toString()),
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

document.body.append(input, add, remove);
