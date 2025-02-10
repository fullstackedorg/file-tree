type CreateFileTreeOpts = {
    readDirectory: (path: string) => { name: string; isDirectory: boolean }[];
};

export function createFileTree(opts: CreateFileTreeOpts) {
    const container = document.createElement("div");
    const flatFileList: {
        path: string;
        isDirectory: boolean;
    }[] = [];

    const renderList = () => {
        container.innerHTML = ``;
        flatFileList.forEach(({ path, isDirectory }) => {
            const depth = path.split("/").length - 2;
            const div = document.createElement("div");
            div.style.marginLeft = depth * 20 + "px";
            div.innerText = path.split("/").pop();
            container.append(div);
            div.onclick = () => {
                if (isDirectory) {
                    openDirectory(path);
                }
            };
        });
    };

    const openDirectory = (path: string) => {
        const indexOfDirectory = flatFileList.findIndex((i) => i.path === path);
        const content: typeof flatFileList = opts
            .readDirectory(path)
            .sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) {
                    return -1;
                } else if (!a.isDirectory && b.isDirectory) {
                    return 1;
                } else {
                    return a.name < b.name ? -1 : 1;
                }
            })
            .map((i) => ({
                path: path + "/" + i.name,
                isDirectory: i.isDirectory,
            }));
        flatFileList.splice(indexOfDirectory + 1, 0, ...content);

        renderList();
    };

    openDirectory("");

    return {
        container,
    };
}
