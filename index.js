import { createFileTree } from ".";
import eruda from "eruda";
eruda.init();

const extensions = [".js", ".ts", ".json"];

function randomIntFromInterval(min, max) {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomName(length, withExt) {
    let result = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength),
        );
        counter += 1;
    }

    if (withExt) {
        result += extensions[randomIntFromInterval(0, extensions.length - 1)];
    }

    return result;
}

function randomFileItem() {
    const isFile = Math.random() >= 0.5;
    return {
        name: randomName(randomIntFromInterval(4, 10), isFile),
        isDirectory: !isFile,
    };
}

function fakeDirectoryContent() {
    const itemsCount = randomIntFromInterval(0, 10);
    return new Array(itemsCount).fill(null).map(randomFileItem);
}

const { container } = createFileTree({
    readDirectory: () => fakeDirectoryContent(),
});

document.body.append(container);
