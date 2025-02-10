type CreateFileTreeOpts = {
    readDirectory: (path: string) => { name: string; isDirectory: boolean }[];
};

export function createFileTree(opts: CreateFileTreeOpts) {
    const container = document.createElement("div");
    const flatFileList: {
        path: string,
        isDirectory: boolean
    }[] = [];

    const renderList = () => {
        flatFileList
            .sort((a, b) => {
                if(a.isDirectory && !b.isDirectory) {
                    return -1
                } else if (!a.isDirectory && b.isDirectory) {
                    return 1
                } else {
                    return a.path < b.path ? -1 : 1
                }
            })
            .forEach(({ path }) => {
                const div = document.createElement("div");
                div.innerText = path;
                container.append(div);
            });
    };

    opts.readDirectory("/").map((i) => flatFileList.push({
        path: i.name,
        isDirectory: i.isDirectory
    }));
    renderList();

    return {
        container,
    };
}
