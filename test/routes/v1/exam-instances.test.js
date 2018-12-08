const db = require('../../../src/db');
const request = require('supertest');
const app = require('../../../src/app');

afterAll(() => db.close());

const route = '/v1/exam-instances';

test(`GET ${route}`, () =>
    request(app)
        .get(route)
        .then(res => {
            expect(res.status).toBe(200);
            expect(res.body).toBeInstanceOf(Array);
            res.body.forEach(examInstance => {
                expect(Object.keys(examInstance).length).toBe(5);
                expect(examInstance).toHaveProperty('id');
                expect(examInstance).toHaveProperty('userIDs');
                expect(examInstance).toHaveProperty('taskIDs');
                expect(examInstance).toHaveProperty('examEventID');
                expect(examInstance).toHaveProperty('finalEvaluation');
            });
        })
);

describe(`GET ${route}/:id`, () => {
    const expectGetError = (id, code) =>
        request(app)
            .get(`${route}/${id}`)
            .then(res => {
                expect.assertions(3);
                expect(res.status).toBe(code);
                expect(res.body).toHaveProperty('code');
                expect(res.body).toHaveProperty('message');
            });

    test('id is alphanumerical', () => expectGetError('tt1', 400));
    test('id is unvalid', () => expectGetError('0', 404));
    test('valid id', async () => {
        const testExamInstance = {
            userIDs: [4, 6, 9],
            taskIDs: [10, 20, 30],
            examEventID: 14,
            finalEvaluation: null
        };
        const examInstance = await db.model('exam_instances').create(testExamInstance);
        await request(app)
            .get(`${route}/${examInstance.id}`)
            .then(res => {
                const instID = examInstance.id;
                expect(res.status).toBe(200);
                expect(res.body).toEqual({id: instID, ...testExamInstance});
                return db.model('exam_instances').destroy({
                    where: {
                        id: instID
                    }
                });
            });
    });
});


describe(`POST ${route}`, () => {
    const expectPostError = body =>
        request(app)
            .post(route)
            .send(body)
            .then(res => {
                expect(res.status).toBe(400);
                expect(res.body).toHaveProperty('code');
                expect(res.body).toHaveProperty('message');
            });

    const defaultBody = {
        userIDs: [7, 9, 10],
        taskIDs: [1, 11, 21],
        examEventID: 23,
        finalEvaluation: null
    };

    test('no body', () =>
        request(app)
            .post(route)
            .then(res => {
                expect(res.status).toBe(400);
                expect(res.body).toHaveProperty('code');
                expect(res.body).toHaveProperty('message');
            })
    );
    test('pass empty json in body', () => expectPostError({}));
    test('pass wrong properties in json', () => expectPostError(
        {
            aaa: 'bbb',
            ccc: 'ddd',
            eee: 'fff',
            ggg: 'hhh'
        }
    ));
    test('userIDs is null', () => expectPostError({...defaultBody, userIDs: null}));
    test('taskIDs is null', () => expectPostError({...defaultBody, taskIDs: null}));
    test('examEventID is null', () => expectPostError({...defaultBody, examEventID: null}));
    test('userIDs is undefined', () => expectPostError({...defaultBody, userIDs: undefined}));
    test('taskIDs is undefined', () => expectPostError({...defaultBody, taskIDs: undefined}));
    test('examEventID is undefined', () => expectPostError({...defaultBody, examEventID: undefined}));
    test('userIDs string instead of integer', () => expectPostError(
        {
            ...defaultBody,
            userIDs: defaultBody.userIDs.map(toString)
        }
    ));
    test('taskIDs string instead of integer', () => expectPostError(
        {
            ...defaultBody,
            taskIDs: defaultBody.taskIDs.map(toString)
        }
    ));
    test('examEventID string instead of integer', () => expectPostError(
        {
            ...defaultBody,
            examEventID: defaultBody.examEventID.toString()
        }
    ));

    test('using arbitrary body', () =>
        request(app)
            .post(route)
            .send(defaultBody)
            .then(res => {
                expect(res.status).toBe(201);
                expect(res.body).toHaveProperty('id');
            })
    );
});

describe(`PUT ${route}/:id`, () => {
    const expectPutErrorWithoutBody = (id, code) =>
        request(app)
            .put(`${route}/${id}`)
            .then(res => {
                expect.assertions(3);
                expect(res.status).toBe(code);
                expect(res.body).toHaveProperty('code');
                expect(res.body).toHaveProperty('message');
            });
    const expectPutErrorWithBody = (id, code, body) =>
        request(app)
            .put(`${route}/${id}`)
            .send(body)
            .then(res => {
                expect.assertions(3);
                expect(res.status).toBe(code);
                expect(res.body).toHaveProperty('code');
                expect(res.body).toHaveProperty('message');
            });

    const bodyAndIdOK = async body => {
        const testExamInstance = {
            userIDs: [4, 6, 9],
            taskIDs: [10, 20, 30],
            examEventID: 14
        };
        const model = db.model('exam_instances');
        const examInstance = await model.create(testExamInstance);
        return request(app)
            .put(`${route}/${examInstance.id}`)
            .send(body)
            .then(async res => {
                expect(res.status).toBe(204);
                const newExamInstance = await model.findByPk(examInstance.id);
                expect(newExamInstance.dataValues).toEqual(
                    {
                        id: examInstance.id,
                        ...body,
                        finalEvaluation: null
                    }
                );
                await model.destroy({where: {id: examInstance.id}});
            });
    };

    const bodyWrongIdOK = async body => {
        const testExamInstance = {
            userIDs: [4, 6, 9],
            taskIDs: [10, 20, 30],
            examEventID: 14
        };
        const model = db.model('exam_instances');
        const examInstance = await model.create(testExamInstance);
        return expectPutErrorWithBody(examInstance.id, 400, body)
            .then(async () => {
                await model.destroy({where: {id: examInstance.id}});
            });
    };

    // Tests on id
    test('no id', () => expectPutErrorWithoutBody('', 501));
    test('id is alphanumerical', () => expectPutErrorWithoutBody('aa2', 400));
    test('id does not exist', () => expectPutErrorWithoutBody('0', 404));

    // Tests on body
    const defaultBody = {
        userIDs: [120, 5, 9, 19],
        taskIDs: [23, 15, 1, 1000],
        examEventID: 201
    };
    test('valid id and empty body', () => bodyWrongIdOK({}));
    test('valid id and wrong properties in body', () => bodyWrongIdOK(
        {
            blabla: 'black sheep',
            have: 'you',
            any: 'wool?'
        }
    ));
    test('valid id and userIDs is null', () => bodyWrongIdOK({...defaultBody, userIDs: null}));
    test('valid id and taskIDs is null', () => bodyWrongIdOK({...defaultBody, taskIDs: null}));
    test('valid id and examEventID is null', () => bodyWrongIdOK({...defaultBody, examEventID: null}));
    test('valid id and userIDs is undefined', () => bodyWrongIdOK({...defaultBody, userIDs: undefined}));
    test('valid id and taskIDs is undefined', () => bodyWrongIdOK({...defaultBody, taskIDs: undefined}));
    test('valid id and examEventID is undefined', () => bodyWrongIdOK({...defaultBody, examEventID: undefined}));
    test('userIDs string instead of integer', () => bodyWrongIdOK(
        {
            ...defaultBody,
            userIDs: defaultBody.userIDs.map(toString)
        }
    ));
    test('taskIDs string instead of integer', () => bodyWrongIdOK(
        {
            ...defaultBody,
            taskIDs: defaultBody.taskIDs.map(toString)
        }
    ));
    test('examEventID string instead of integer', () => bodyWrongIdOK(
        {
            ...defaultBody,
            examEventID: defaultBody.examEventID.toString()
        }
    ));

    // Everything ok
    test('valid id and valid body', () => bodyAndIdOK(defaultBody));
});

describe(`DELETE ${route}/:id`, () => {
    const deleteError = (id, code) =>
        request(app)
            .delete(`${route}/${id}`)
            .then(res => {
                expect(res.status).toBe(code);
                expect(res.body).toHaveProperty('code');
                expect(res.body).toHaveProperty('message');
            });

    test('no id', () => deleteError('', 400));
    test('alphanumerical id', () => deleteError('bbs213l', 400));
    test('id does not exist', () => deleteError('0', 404));
    test('valid id', async () => {
        const testExamInstance = {
            userIDs: [4, 6, 9],
            taskIDs: [10, 20, 30],
            examEventID: 14
        };
        const model = db.model('exam_instances');
        const examInstance = await model.create(testExamInstance);
        return request(app)
            .delete(`${route}/${examInstance.id}`)
            .then(async res => {
                expect(res.status).toBe(204);
                const testing = await model.findByPk(examInstance.id);
                expect(testing).toBeFalsy();
            });
    });
});