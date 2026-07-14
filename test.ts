const obj = {
    show() {
        console.log("global obj");
    }
};

function foo() {
    const obj = {
        show() {
            console.log("local obj");
        }
    };

    bar();
}

function bar() {
    obj.show();
}

foo();