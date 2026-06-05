/** Frontend-only question image attachment (never sent to the API). */
export interface QuestionImageAttachment {
  imageName: string;
  imageType: string;
  imageSize: number;
  imageData: string;
}
